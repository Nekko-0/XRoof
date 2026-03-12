(function() {
  var script = document.currentScript;
  var contractorId = script.getAttribute('data-contractor');
  if (!contractorId) return;

  var iframe = document.createElement('iframe');
  iframe.src = (script.getAttribute('data-host') || 'https://xroof.io') + '/widget/' + contractorId;
  iframe.style.cssText = 'width:100%;max-width:450px;height:500px;border:none;border-radius:16px;';
  iframe.setAttribute('title', 'Roof Estimate Widget');

  var container = document.createElement('div');
  container.style.cssText = 'display:flex;justify-content:center;';
  container.appendChild(iframe);

  script.parentNode.insertBefore(container, script.nextSibling);
})();
