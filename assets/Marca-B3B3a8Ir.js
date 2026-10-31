import{a as c}from"./vendor-CNPXXNeH.js";var d={exports:{}},a={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var u=c,m=Symbol.for("react.element"),p=Symbol.for("react.fragment"),f=Object.prototype.hasOwnProperty,_=u.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,v={key:!0,ref:!0,__self:!0,__source:!0};function l(r,t,n){var e,o={},i=null,x=null;n!==void 0&&(i=""+n),t.key!==void 0&&(i=""+t.key),t.ref!==void 0&&(x=t.ref);for(e in t)f.call(t,e)&&!v.hasOwnProperty(e)&&(o[e]=t[e]);if(r&&r.defaultProps)for(e in t=r.defaultProps,t)o[e]===void 0&&(o[e]=t[e]);return{$$typeof:m,type:r,key:i,ref:x,props:o,_owner:_.current}}a.Fragment=p;a.jsx=l;a.jsxs=l;d.exports=a;var s=d.exports;function y({tamanho:r="pequena",comSubtitulo:t=!0,className:n=""}){const e=r==="grande";return s.jsxs("div",{className:`flex flex-col items-center ${n}`,children:[s.jsx("div",{className:`font-serif tracking-[0.22em] text-dourado ${e?"text-4xl":"text-xl"}`,"aria-hidden":"true",children:"GM"}),s.jsx("div",{className:`h-px bg-dourado/50 ${e?"w-24 my-3":"w-12 my-1.5"}`,"aria-hidden":"true"}),s.jsxs("div",{className:`font-serif text-center leading-tight text-white ${e?"text-xl":"text-sm"}`,children:[s.jsx("span",{className:"text-dourado",children:"G"}),"Menezes"]}),t&&s.jsx("div",{className:`font-sans uppercase text-white/60 tracking-[0.18em] ${e?"text-[11px] mt-2":"text-[9px] mt-1"}`,children:"Advogados Associados"})]})}export{y as M,s as j};
