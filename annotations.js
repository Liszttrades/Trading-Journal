export function validateAnnotations(items) {
  if (!Array.isArray(items) || items.length > 500) throw Error('Use up to 500 annotations per chart.');
  return items.map(a => {
    if (!a || !['line','rect','ellipse','text','pen'].includes(a.type) || !/^#[0-9a-f]{6}$/i.test(a.color) || !Number.isFinite(a.width) || a.width < 1 || a.width > 20) throw Error('Invalid annotation.');
    if (!Array.isArray(a.points) || a.points.length < 1 || a.points.length > 10000 || !a.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<=1))) throw Error('Invalid annotation coordinates.');
    if (typeof (a.text ?? '') !== 'string' || (a.text ?? '').length > 500) throw Error('Keep chart text under 500 characters.');
    return {type:a.type,color:a.color,width:a.width,points:a.points.map(p=>[...p]),text:a.text ?? ''};
  });
}
