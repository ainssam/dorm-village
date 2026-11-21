import { HEALTH_QUIZ } from './health-quiz-data.js';

export function createHealthQuizState() {
  let index = 0;
  let selected = null;
  let done = false;
  const reviewed = new Set();
  return {
    get question() { return HEALTH_QUIZ.questions[index]; },
    choose(value) {
      if (done || !Number.isInteger(value) || value < 0 || value >= HEALTH_QUIZ.questions[index].choices.length) return false;
      selected = value;
      reviewed.add(index);
      return true;
    },
    retry() { if (!done) selected = null; },
    next() {
      if (done || selected === null) return false;
      if (index === HEALTH_QUIZ.questions.length - 1) done = true;
      else { index++; selected = null; }
      return true;
    },
    reset() { index = 0; selected = null; done = false; reviewed.clear(); },
    snapshot: () => ({
      index, selected, done,
      correct: selected === null ? null : selected === HEALTH_QUIZ.questions[index].correct,
      reviewed: reviewed.size
    })
  };
}

export function openHealthQuiz(ui) {
  const model = createHealthQuizState();
  const total = HEALTH_QUIZ.questions.length;
  return ui.workshop(HEALTH_QUIZ.title, `
    <p class="health-quiz-intro">학교에서 만날 수 있는 ${total}가지 상황이에요. 답을 하나 고르면 아래에 이유가 나와요.</p>
    <p id="health-quiz-count" class="caption"></p>
    <section id="health-quiz-question" aria-labelledby="health-quiz-prompt">
      <h3 id="health-quiz-prompt" tabindex="-1"></h3>
      <div class="music-choices" id="health-quiz-choices"></div>
    </section>
    <div id="health-quiz-answer" aria-live="polite" aria-atomic="true">
      <p id="health-quiz-feedback" class="learning-feedback" hidden></p>
    </div>
    <div class="school-tool-row">
      <button id="health-quiz-retry" hidden>다시 고르기</button>
      <button class="primary" id="health-quiz-next" disabled>다음 문제</button>
      <button id="health-quiz-reset" hidden>처음부터 다시</button>
    </div>
    <details class="learning-source" id="health-quiz-reference">
      <summary>이 문제의 출처 보기</summary>
      <div id="health-quiz-sources"></div>
      <p class="caption">공식 기관 자료를 읽고 도름마을에서 만든 연습 문제예요.</p>
    </details>
    <p class="caption">가상 상황을 다루는 놀이예요. 진단·치료 안내를 제공하거나 개인 건강정보를 저장하지 않아요.</p>
  `, () => {
    const $ = id => document.getElementById(id);
    const choices = $('health-quiz-choices');
    const prompt = $('health-quiz-prompt');
    const feedback = $('health-quiz-feedback');
    const next = $('health-quiz-next');
    const retry = $('health-quiz-retry');
    const reset = $('health-quiz-reset');
    const reference = $('health-quiz-reference');

    function renderAnswer() {
      const { index, selected, correct, done } = model.snapshot();
      const q = model.question;
      for (const [i, button] of Array.from(choices.children).entries()) {
        button.setAttribute('aria-pressed', String(i === selected));
      }
      feedback.hidden = selected === null && !done;
      feedback.textContent = done
        ? '여덟 가지 상황을 살펴봤어요. 오늘 해 보고 싶은 습관 하나를 떠올려 보세요.'
        : selected === null ? ''
        : correct ? '좋아요! ' + q.feedback
        : '다른 답을 골라볼까요? ' + q.retry;
      next.hidden = done;
      next.disabled = selected === null;
      next.textContent = index === total - 1 ? '마치기' : '다음 문제';
      retry.hidden = done || selected === null;
      reset.hidden = !done;
    }

    function showFeedback() {
      const dialog = feedback.closest('dialog');
      if (!dialog || feedback.hidden) return;
      const bounds = dialog.getBoundingClientRect();
      const rect = feedback.getBoundingClientRect();
      if (rect.top < bounds.top || rect.bottom > bounds.bottom) {
        feedback.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      }
    }

    function renderQuestion({ moveFocus = false } = {}) {
      const { index, done } = model.snapshot();
      const q = model.question;
      $('health-quiz-count').textContent = done ? `${total} / ${total} · 모두 살펴봤어요` : `${index + 1} / ${total}`;
      $('health-quiz-question').hidden = done;
      reference.hidden = done;
      reference.open = false;
      if (!done) {
        prompt.textContent = q.prompt;
        choices.replaceChildren();
        for (const [i, label] of q.choices.entries()) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = label;
          button.onclick = () => {
            if (!model.choose(i)) return;
            renderAnswer();
            showFeedback();
          };
          choices.append(button);
        }
        const sources = $('health-quiz-sources');
        sources.replaceChildren();
        for (const id of q.sources) {
          const source = HEALTH_QUIZ.sources[id];
          const p = document.createElement('p');
          const link = document.createElement('a');
          link.href = source.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = source.publisher + ' · ' + source.title;
          p.append(link);
          sources.append(p);
        }
        const location = document.createElement('p');
        location.textContent = q.sourceLocation;
        sources.append(location);
      }
      renderAnswer();
      if (moveFocus) (done ? reset : prompt).focus();
    }

    retry.onclick = () => {
      const previous = model.snapshot().selected;
      model.retry();
      renderAnswer();
      (choices.children[previous] ?? prompt).focus();
    };
    next.onclick = () => {
      if (model.next()) renderQuestion({ moveFocus: true });
    };
    reset.onclick = () => {
      model.reset();
      renderQuestion({ moveFocus: true });
    };
    renderQuestion();
  });
}
