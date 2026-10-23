// Small original recipe illustrations; inline SVG follows the button's label.
export function recipeArt(id){
 const drawings={
  salad:`<path d="M13 31c3 16 11 23 23 23s20-7 23-23Z" fill="#d6e5d6"/><path d="M13 31c3 16 11 23 23 23s20-7 23-23"/><ellipse cx="36" cy="31" rx="23" ry="8" fill="#f8f5df"/><path d="M24 29c-12-16 6-21 12-5 2-18 23-15 13 3" fill="#8faa80"/><circle cx="25" cy="32" r="5" fill="#dba083"/><circle cx="44" cy="32" r="6" fill="#e7c274"/><path d="m50 15 5-8M56 19l7-4"/>`,
  pancake:`<ellipse cx="36" cy="51" rx="28" ry="7" fill="#e1e9e5"/><path d="M15 35v11c0 10 42 10 42 0V35" fill="#d8ac75"/><path d="M15 40c0 10 42 10 42 0"/><ellipse cx="36" cy="35" rx="21" ry="8" fill="#ebc58b"/><path d="M28 31c2 7 7 4 8 10s6 6 8-1l1-8" fill="#bb825b" stroke="none"/><path d="m31 25 12 1-2 7-12-1Z" fill="#f5dfa2"/><path d="M26 19c-5-5 4-6 0-11M44 18c-5-5 4-6 0-11"/>`,
  cocoa:`<ellipse cx="34" cy="56" rx="24" ry="5" fill="#e5ded5"/><path d="M50 30c17-8 18 15 0 14" fill="none" stroke-width="4"/><path d="M15 26h37v19c0 16-37 16-37 0Z" fill="#c5d8e0"/><ellipse cx="33.5" cy="26" rx="18.5" ry="6" fill="#9e7159"/><path d="m33 32 2 5 5 1-4 3 1 5-4-3-5 3 1-5-4-3 5-1Z" fill="#fff5db" stroke="none"/><path d="M27 17c-6-6 5-7 0-13M40 17c-6-6 5-7 0-13"/>`
 };
 return `<svg class="recipe-art" viewBox="0 0 72 68" fill="none" stroke="#6f6555" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[id]??drawings.salad}</svg>`;
}
