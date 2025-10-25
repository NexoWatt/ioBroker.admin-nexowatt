(function(){
  function inject(){
    if (document.getElementById('nexowatt-badge')) return;
    var div = document.createElement('div');
    div.id = 'nexowatt-badge';
    var img = document.createElement('img');
    img.src = 'img/logo.png'; // served by admin.themes/nexowatt/img/logo.png
    var span = document.createElement('span');
    span.textContent = 'NexoWatt EMS';
    div.appendChild(img); div.appendChild(span);
    document.body.appendChild(div);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
  console.log('NexoWatt theme active');
})();