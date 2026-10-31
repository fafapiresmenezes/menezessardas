function R(r){let n="";for(const s of r){const e=s.codePointAt(0);e===8212||e===8211?n+="-":e===8217||e===8216?n+="'":e===8220||e===8221?n+='"':e===8230?n+="...":e<256?n+=s:n+="?"}return n.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)")}function g(r){const n=new Uint8Array(new ArrayBuffer(r.length));for(let s=0;s<r.length;s++)n[s]=r.charCodeAt(s)&255;return n}function y(r,n,s=595.28-2*40){const e=Math.max(10,Math.floor(s/(n*.5))),c=[];for(const f of r.split(`
`)){let o="";for(const a of f.split(" "))(o+" "+a).trim().length>e?(o&&c.push(o),o=a):o=(o+" "+a).trim();c.push(o)}return c}function L(r,n){const s=[];let e="",c=801.89;const f=()=>{s.push(e),e="",c=841.89-40};for(const t of n){const i=t.tamanho??9;c-i*1.35<40&&f(),c-=i*1.35;const F=t.cor??[.1,.1,.1];e+=`BT /${t.negrito?"F2":"F1"} ${i} Tf ${F.join(" ")} rg ${(t.x??40).toFixed(2)} ${c.toFixed(2)} Td (${R(t.texto)}) Tj ET
`}f();const o=[],a=t=>(o.push(t),o.length),h=a("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),$=a("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"),u=o.length+1+s.length*2,p=[];for(const t of s){const i=a(`<< /Length ${g(t).length} >>
stream
${t}endstream`);p.push(a(`<< /Type /Page /Parent ${u} 0 R /MediaBox [0 0 ${595.28} ${841.89}] /Resources << /Font << /F1 ${h} 0 R /F2 ${$} 0 R >> >> /Contents ${i} 0 R >>`))}const d=a(`<< /Type /Pages /Kids [${p.map(t=>`${t} 0 R`).join(" ")}] /Count ${p.length} >>`),T=a(`<< /Type /Catalog /Pages ${d} 0 R >>`),E=a(`<< /Title (${R(r)}) /Producer (Plataforma GMenezes) >>`);let l=`%PDF-1.4
%âãÏÓ
`;const A=[];o.forEach((t,i)=>{A.push(g(l).length),l+=`${i+1} 0 obj
${t}
endobj
`});const M=g(l).length;return l+=`xref
0 ${o.length+1}
0000000000 65535 f 
`+A.map(t=>`${String(t).padStart(10,"0")} 00000 n 
`).join(""),l+=`trailer
<< /Size ${o.length+1} /Root ${T} 0 R /Info ${E} 0 R >>
startxref
${M}
%%EOF
`,g(l)}export{L as g,y as q};
