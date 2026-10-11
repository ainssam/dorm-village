import os,json,pathlib,signal,subprocess,time,sys,resource

base=pathlib.Path(__file__).resolve().parent.parent
folder=pathlib.Path(os.environ.get('CASTLE_OUTPUT_DIR',str(base/'preview')))
folder.mkdir(exist_ok=True)
started=time.monotonic()
evidence={'limits':{'rssTreeMiB':512,'minAvailableMiB':1024,'startAvailableMiB':1536,'timeoutSeconds':90,'sampleSeconds':.10},'runs':[]}

def available():
    for line in pathlib.Path('/proc/meminfo').read_text().splitlines():
        if line.startswith('MemAvailable:'):return int(line.split()[1])/1024
    raise RuntimeError('MemAvailable unavailable')

def tree_rss(pid):
    all_processes={}
    for f in pathlib.Path('/proc').glob('[0-9]*/status'):
        try:
            fields={line.split(':',1)[0]:line.split(':',1)[1].strip() for line in f.read_text().splitlines() if ':' in line}
            all_processes[int(f.parent.name)]=(int(fields['PPid']),int(fields.get('VmRSS','0 kB').split()[0])/1024)
        except (FileNotFoundError,ProcessLookupError,PermissionError):continue
    if pid not in all_processes:raise RuntimeError('Child RSS inaccessible')
    ids={pid}
    while True:
        found={p for p,(parent,_) in all_processes.items() if parent in ids}
        if found<=ids:break
        ids |= found
    return sum(all_processes[p][1] for p in ids),sorted(ids)

def run(name,command):
    before=available()
    if before<1536:raise RuntimeError(f'{name}: insufficient preflight available memory {before:.1f} MiB')
    log=folder/f'{name}.log'
    record={'name':name,'availableBeforeMiB':before,'peakObservedTreeRssMiB':0,'minObservedAvailableMiB':before,'samples':0,'terminatedReason':None}
    evidence['runs'].append(record)
    with log.open('w') as output:
        p=subprocess.Popen(command,stdout=output,stderr=subprocess.STDOUT,start_new_session=True,
            env={**os.environ,'OMP_NUM_THREADS':'1','OPENBLAS_NUM_THREADS':'1','MKL_NUM_THREADS':'1'})
        record['pid']=p.pid
        try:
            while p.poll() is None:
                rss,pids=tree_rss(p.pid)
                free=available()
                record['peakObservedTreeRssMiB']=max(record['peakObservedTreeRssMiB'],rss)
                record['minObservedAvailableMiB']=min(record['minObservedAvailableMiB'],free)
                record['samples']+=1
                record['observedProcessIds']=sorted(set(record.get('observedProcessIds',[])+pids))
                if rss>512:raise RuntimeError(f'process-tree RSS exceeded 512 MiB: {rss:.1f}')
                if free<1024:raise RuntimeError(f'host MemAvailable fell below 1024 MiB: {free:.1f}')
                if time.monotonic()-started>90:raise RuntimeError('combined export/render exceeded 90 seconds')
                time.sleep(.10)
        except Exception as error:
            record['terminatedReason']=str(error)
            os.killpg(p.pid,signal.SIGTERM)
            try:p.wait(timeout=2)
            except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
            raise
        finally:
            record['returnCode']=p.wait()
            record['nativeChildPeakRssMiB']=resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss/1024
    if record['returnCode']!=0:raise RuntimeError(f'{name} failed with return code {record["returnCode"]}')

try:
    if '--render-only' in sys.argv:
        export_evidence=pathlib.Path(os.environ.get('CASTLE_EXPORT_EVIDENCE',str(folder/'resource-evidence.json')))
        evidence['earlierExportEvidence']=json.loads(export_evidence.read_text())['runs'][0]
        input_glb=pathlib.Path(os.environ.get('CASTLE_INPUT_GLB',str(folder/'castle-exterior.glb')))
        if not input_glb.is_file():raise RuntimeError('Completed export missing')
        evidence['inputGlb']=str(input_glb)
        evidence['renderSettings']={'width':int(os.environ.get('CASTLE_RENDER_SIZE','512')),'height':int(os.environ.get('CASTLE_RENDER_SIZE','512')),'samples':int(os.environ.get('CASTLE_RENDER_SAMPLES','8')),'cpuThreads':1,'denoising':False,'textures':False}
    else:
        run('export',['node','--max-old-space-size=384',str(base/'source/export-preview.mjs')])
    # A child /proc observation probe passed before this script was authored.
    # Export is complete before Blender is started, and its RSS remained observable.
    if '--export-only' not in sys.argv:
        run('render',['/usr/bin/blender','--background','--threads','1','--python',str(base/'source/render-preview.py')])
    evidence['status']='completed'
except Exception as error:
    evidence['status']='stopped'
    evidence['error']=str(error)
finally:
    evidence['elapsedSeconds']=time.monotonic()-started
    evidence['availableAfterMiB']=available()
    (folder/'resource-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')
    print(json.dumps(evidence,indent=2),flush=True)
if evidence['status']!='completed':raise SystemExit(1)
