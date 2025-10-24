(function(){
  function inject(){
    if (document.getElementById('nexowatt-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'nexowatt-badge';
    const img = document.createElement('img');
    img.src = '/__nexowatt__/img/logo.png';
    const span = document.createElement('span');
    span.textContent = 'NexoWatt EMS';
    badge.appendChild(img);
    badge.appendChild(span);
    document.body.appendChild(badge);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
  console.log('NexoWatt EMS overlay loaded');
})();