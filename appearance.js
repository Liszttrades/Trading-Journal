(()=>{
 const root=document.documentElement,media=matchMedia('(prefers-color-scheme: dark)');
 const themes=[['classic','Slate & peach','Light, dark or system'],['olive','Olive Paper','Light · olive, sand and blue'],['crimson','Crimson Cream','Light · red, cream and amber'],['ultraviolet','Ultraviolet','Dark · violet and midnight'],['ember','Ember Black','Dark · orange and charcoal']];
 const accents=['neutral','tennis','blue','graphite','sage','plum'];
 let preferences={mode:'system',accent:'neutral',palette:'classic'};
 try{const saved=JSON.parse(localStorage.getItem('trade-notebook-appearance')||'null');if(saved){if(['system','light','dark'].includes(saved.mode))preferences.mode=saved.mode;if(accents.includes(saved.accent))preferences.accent=saved.accent;if(themes.some(([id])=>id===saved.palette))preferences.palette=saved.palette;}}catch{}
 function apply(){
  const fixed={olive:'light',crimson:'light',ultraviolet:'dark',ember:'dark'};
  root.dataset.theme=fixed[preferences.palette]||(preferences.mode==='system'?(media.matches?'dark':'light'):preferences.mode);
  root.dataset.palette=preferences.palette;
  root.dataset.accent=preferences.palette==='classic'?preferences.accent:'neutral';root.style.colorScheme=root.dataset.theme;
  document.querySelectorAll('[data-appearance-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.appearanceMode===preferences.mode)));
  document.querySelectorAll('[data-appearance-accent]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.appearanceAccent===preferences.accent)));
  document.querySelectorAll('[data-appearance-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.appearancePalette===preferences.palette)));
  for(const id of ['appearance-mode-options','appearance-accent-options']){const field=document.getElementById(id);if(field)field.hidden=preferences.palette!=='classic';}
 }
 function save(){try{localStorage.setItem('trade-notebook-appearance',JSON.stringify(preferences));}catch{}apply();}
 apply();media.addEventListener('change',()=>{if(preferences.mode==='system'&&preferences.palette==='classic')apply();});
 document.addEventListener('DOMContentLoaded',()=>{
  const dialog=document.createElement('dialog');dialog.id='appearance-dialog';dialog.setAttribute('aria-labelledby','appearance-title');
  dialog.innerHTML='<div class="appearance-heading"><h2 id="appearance-title">Appearance</h2><button type="button" data-appearance-close aria-label="Close appearance">×</button></div><p>Choose the colors for your entire workspace.</p><fieldset><legend>Workspace theme</legend><div class="appearance-themes">'+themes.map(([id,label,detail])=>`<button type="button" data-appearance-palette="${id}" aria-pressed="false"><i class="theme-preview theme-preview-${id}" aria-hidden="true"><span></span><span></span><span></span></i><strong>${label}</strong><small>${detail}</small></button>`).join('')+'</div></fieldset><fieldset id="appearance-mode-options"><legend>Mode</legend><div class="appearance-modes">'+[['system','◐','System'],['light','☀','Light'],['dark','☾','Dark']].map(([v,icon,label])=>`<button type="button" data-appearance-mode="${v}" aria-pressed="false"><span aria-hidden="true">${icon}</span>${label}</button>`).join('')+'</div></fieldset><fieldset id="appearance-accent-options"><legend>Accent color</legend><div class="appearance-accents">'+[['neutral','Peach'],['tennis','Tennis'],['blue','Blue'],['graphite','Graphite'],['sage','Sage'],['plum','Plum']].map(([v,label])=>`<button type="button" data-appearance-accent="${v}" aria-pressed="false"><i class="swatch swatch-${v}" aria-hidden="true"></i>${label}</button>`).join('')+'</div></fieldset><p class="helper">Saved on this browser. Olive and Crimson are light themes; Ultraviolet and Ember are dark themes.</p>';
  document.body.append(dialog);
  document.addEventListener('click',e=>{const mode=e.target.closest('[data-appearance-mode]'),accent=e.target.closest('[data-appearance-accent]'),palette=e.target.closest('[data-appearance-palette]');if(mode){preferences.mode=mode.dataset.appearanceMode;save();}if(accent){preferences.accent=accent.dataset.appearanceAccent;save();}if(palette){preferences.palette=palette.dataset.appearancePalette;save();}if(e.target.closest('[data-open-appearance]')){apply();dialog.showModal();}if(e.target.closest('[data-appearance-close]'))dialog.close();});apply();
 });
})();
