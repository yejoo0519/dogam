(function(){
  'use strict';
  const slider=document.getElementById('ratio');
  function render(){
    const percent=Number(slider.value);
    // Use the calculator's actual TAR implementation with a known reference.
    const value=percent===0?0:tarPercent(TAR_M['체력형']['0']*percent/100,'체력형',{});
    document.getElementById('ratio-value').textContent=percent+'%';
    document.getElementById('tar-value').textContent=value.toFixed(1);
  }
  slider.addEventListener('input',render);
  render();
})();
