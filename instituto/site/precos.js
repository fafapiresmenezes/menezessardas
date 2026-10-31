(function(){
  var f=document.getElementById('calc'); if(!f) return;
  var brl=function(v){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});};
  function calc(){
    var g=function(id){return parseFloat(f.elements[id].value.replace(',','.'))||0;};
    var te=13121*g('tok'), ts=4619*g('tok');
    var consulta=((te*2+ts*10)/1e6*2+0.000361)*g('ptax')*1.25;
    var fixo=g('nuvem')*g('ptax')+40/12+g('gratis')*consulta;
    var preco=g('preco'), varm=consulta*g('uso');
    var contrib=preco-varm-preco*0.06;
    document.getElementById('r-consulta').textContent=brl(consulta);
    document.getElementById('r-fixo').textContent=brl(fixo);
    document.getElementById('r-contrib').textContent=brl(contrib);
    document.getElementById('r-be').textContent=contrib>0?Math.ceil(fixo/contrib)+' membros':'não empata';
    var mk=preco/varm;
    var el=document.getElementById('r-mk'); el.textContent=mk.toFixed(1).replace('.',',')+'×';
    el.className=mk>=4?'ok':'alerta';
  }
  f.addEventListener('input',calc); f.addEventListener('submit',function(e){e.preventDefault();}); calc();
})();
