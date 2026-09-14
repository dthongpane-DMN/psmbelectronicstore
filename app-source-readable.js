/* ============================================================
   CBF Stock & Billing — ລະບົບສະຕັອກ, ໃບບິນ ແລະ ໃບຮັບເງິນ
   Runs two ways from one file:
     • inside a Claude artifact  → shared artifact database
     • installed as a PWA        → local storage + optional Supabase sync
   ============================================================ */
const MODE = (window.claude && typeof window.claude.use === 'function') ? 'artifact' : 'pwa';
const LS_LANG='cbf.lang', CFG_KEY='cbf.cfg', DATA_KEY='cbf.data';
let lang='la';
try{ lang = localStorage.getItem(LS_LANG) || 'la'; }catch(e){}

const D={
  nav_dash:['ພາບລວມ','Dashboard'], nav_prod:['ລາຍການສີນຄ້າ','Products'],
  nav_in:['ຮັບເຂົ້າສະຕັອກ','Stock In'], nav_wh:['ສາງ & ໂອນຍ້າຍ','Warehouses'],
  nav_inv:['ໃບບິນຂາຍ','Invoices'], nav_quo:['ໃບສະເໜີລາຄາ','Quotations'],
  nav_rcpt:['ໃບຮັບເງິນ','Receipts'], nav_part:['ລູກຄ້າ / ຜູ້ສະໜອງ','Contacts'],
  nav_rep:['ສະຫຼຸບປະຈຳເດືອນ','Monthly Report'], nav_set:['ຕັ້ງຄ່າ','Settings'],
  nav_sync:['ຊິງຄ໌ & ຕິດຕັ້ງ','Sync & Install'],
  grp_stock:['ສະຕັອກ','Stock'], grp_sell:['ການຂາຍ','Sales'], grp_sys:['ລະບົບ','System'],

  sub_dash:['ສະພາບສະຕັອກ ແລະ ຍອດຂາຍລວມ','Stock position and sales at a glance'],
  sub_prod:['ຂໍ້ມູນສີນຄ້າ, ລາຄາ ແລະ ຈຸດສັ່ງຊື້','Item master, pricing and reorder points'],
  sub_in:['ບັນທຶກການຮັບສີນຄ້າເຂົ້າຕາມ Lot, ວັນໝົດອາຍຸ ແລະ ສາງ','Receive goods by lot, expiry and warehouse'],
  sub_wh:['ຈັດການສາງ ແລະ ໂອນຍ້າຍສີນຄ້າລະຫວ່າງສາງ','Manage warehouses and move stock between them'],
  sub_inv:['ອອກບິນຂາຍ ແລະ ຕັດສະຕັອກອັດຕະໂນມັດ','Issue invoices — stock is deducted automatically'],
  sub_quo:['ສະເໜີລາຄາໃຫ້ລູກຄ້າ ແລະ ປ່ຽນເປັນບິນຂາຍໄດ້','Quote customers and convert to an invoice'],
  sub_rcpt:['ບັນທຶກການຮັບຊຳລະຈາກລູກຄ້າ ແລະ ພິມໃບຮັບເງິນ','Record customer payments and print receipts'],
  sub_part:['ລາຍຊື່ຄູ່ຮ່ວມທຸລະກິດ','Business contacts'],
  sub_rep:['ສະຫຼຸບຍອດຂາຍ ແລະ ການເຄື່ອນໄຫວສີນຄ້າ','Sales and stock movement summary'],
  sub_set:['ຂໍ້ມູນບໍລິສັດ ແລະ ອັດຕາແລກປ່ຽນ','Company details and exchange rate'],
  sub_sync:['ແຊຂໍ້ມູນຫຼາຍເຄື່ອງ ແລະ ຕິດຕັ້ງແອັບ','Share data across devices and install the app'],

  stock_value:['ມູນຄ່າສະຕັອກ','Stock value'], low_stock:['ສີນຄ້າໃກ້ໝົດ','Low stock items'],
  expiring:['ໃກ້ໝົດອາຍຸ (90 ວັນ)','Expiring (90 days)'], sales_month:['ຍອດຂາຍເດືອນນີ້','Sales this month'],
  monthly_sales:['ຍອດຂາຍ 6 ເດືອນຫຼ້າສຸດ','Sales — last 6 months'],
  need_reorder:['ຕ້ອງສັ່ງຊື້ເພີ່ມ','Needs reordering'], expiry_watch:['ຕິດຕາມວັນໝົດອາຍຸ','Expiry watch'],
  recent_inv:['ບິນຂາຍຫຼ້າສຸດ','Recent invoices'], by_wh:['ສະຕັອກຕາມສາງ','Stock by warehouse'],
  receivable:['ລູກໜີ້ຄ້າງຊຳລະ','Receivable'],

  code:['ລະຫັດ','Code'], name:['ຊື່ສີນຄ້າ','Item name'], unit:['ຫົວໜ່ວຍ','Unit'],
  category:['ໝວດ','Category'], cost:['ລາຄາຕົ້ນທຶນ','Cost'], price:['ລາຄາຂາຍ','Sell price'],
  stock:['ຄົງເຫຼືອ','On hand'], reorder:['ຈຸດສັ່ງຊື້','Reorder pt'], status:['ສະຖານະ','Status'],
  act:['ຈັດການ','Actions'], lot:['ເລກ Lot','Lot no.'], expiry:['ວັນໝົດອາຍຸ','Expiry'],
  qty:['ຈຳນວນ','Qty'], remain:['ຄົງເຫຼືອ','Remaining'], date:['ວັນທີ','Date'],
  supplier:['ຜູ້ສະໜອງ','Supplier'], customer:['ລູກຄ້າ','Customer'], total:['ລວມ','Total'],
  note:['ໝາຍເຫດ','Note'], phone:['ໂທລະສັບ','Phone'], address:['ທີ່ຢູ່','Address'],
  contact:['ຜູ້ຕິດຕໍ່','Contact'], taxid:['ເລກອາກອນ','Tax ID'], type:['ປະເພດ','Type'],
  no:['ເລກທີ','No.'], items:['ລາຍການ','Items'], discount:['ສ່ວນຫຼຸດ','Disc %'],
  subtotal:['ລວມຍ່ອຍ','Subtotal'], vat:['ອາກອນ VAT','VAT'], grand:['ລວມທັງໝົດ','Grand total'],
  valid:['ໃຊ້ໄດ້ຮອດ','Valid until'],

  warehouse:['ສາງ','Warehouse'], all_wh:['ທຸກສາງ','All warehouses'],
  add_wh:['ເພີ່ມສາງ','Add warehouse'], transfer:['ໂອນຍ້າຍ','Transfer'],
  new_transfer:['ໂອນຍ້າຍສີນຄ້າ','New transfer'], from_wh:['ຈາກສາງ','From warehouse'],
  to_wh:['ໄປສາງ','To warehouse'], transfers:['ປະຫວັດການໂອນຍ້າຍ','Transfer history'],
  wh_needed:['ຕ້ອງສ້າງສາງກ່ອນ','Create a warehouse first'], main_wh:['ສາງໃຫຍ່','Main store'],

  add_prod:['ເພີ່ມສີນຄ້າ','Add product'], add_in:['ຮັບເຂົ້າ','Receive stock'],
  add_inv:['ສ້າງບິນຂາຍ','New invoice'], add_quo:['ສ້າງໃບສະເໜີລາຄາ','New quotation'],
  add_rcpt:['ຮັບເງິນ','New receipt'], add_part:['ເພີ່ມລາຍຊື່','Add contact'],
  add_item:['+ ເພີ່ມແຖວ','+ Add row'], save:['ບັນທຶກ','Save'], cancel:['ຍົກເລີກ','Cancel'],
  edit:['ແກ້ໄຂ','Edit'], del:['ລຶບ','Delete'], print:['ພິມ','Print'], close:['ປິດ','Close'],
  issue:['ອອກບິນ & ຕັດສະຕັອກ','Issue & deduct stock'], voidit:['ຍົກເລີກບິນ','Void'],
  convert:['ປ່ຽນເປັນບິນຂາຍ','Convert to invoice'], search:['ຄົ້ນຫາ...','Search...'],
  all:['ທັງໝົດ','All'], draft:['ຮ່າງ','Draft'], issued:['ອອກແລ້ວ','Issued'],
  voided:['ຍົກເລີກ','Voided'], sent:['ສົ່ງແລ້ວ','Sent'], accepted:['ຕົກລົງ','Accepted'],
  back:['ກັບຄືນ','Back'], next:['ຕໍ່ໄປ','Next'],

  ok_stock:['ພຽງພໍ','OK'], low:['ໃກ້ໝົດ','Low'], out:['ໝົດ','Out'],
  expired:['ໝົດອາຍຸ','Expired'], none:['ຍັງບໍ່ມີຂໍ້ມູນ','Nothing here yet'],
  confirm_del:['ຢືນຢັນການລຶບ?','Delete this record?'], saved:['ບັນທຶກແລ້ວ','Saved'],
  deleted:['ລຶບແລ້ວ','Deleted'], nostock:['ສະຕັອກບໍ່ພຽງພໍ','Not enough stock'],
  company:['ຊື່ຮ້ານ','Shop name'], rate:['ອັດຕາແລກປ່ຽນ 1 USD = ? LAK','Exchange rate 1 USD = ? LAK'],
  logo:['ໂລໂກ້ຮ້ານ','Shop logo'], pick_logo:['ເລືອກຮູບ','Choose image'],
  rm_logo:['ລຶບໂລໂກ້','Remove logo'], no_logo:['ຍັງບໍ່ມີໂລໂກ້','No logo yet'],
  logo_hint:['PNG ຫຼື JPG — ຈະສະແດງໜ້າຊື່ຮ້ານ ແລະ ຢູ່ຫົວໃບບິນ, ໃບສະເໜີລາຄາ, ໃບຮັບເງິນ ແລະ ລາຍງານ',
             'PNG or JPG — appears beside the shop name and at the top of every invoice, quotation, receipt and report'],
  vatrate:['ອັດຕາ VAT (%)','VAT rate (%)'], bank:['ບັນຊີທະນາຄານ','Bank account'],
  qty_sold:['ຈຳນວນຂາຍ','Qty sold'], revenue:['ຍອດຂາຍ','Revenue'],
  cogs:['ຕົ້ນທຶນຂາຍ','Cost of sales'], profit:['ກຳໄລຂັ້ນຕົ້ນ','Gross profit'],
  month:['ເດືອນ','Month'], received:['ຮັບເຂົ້າ','Received'], invoices_n:['ຈຳນວນບິນ','Invoices'],
  export:['ດາວໂຫຼດ CSV','Download CSV'], by_prod:['ສະຫຼຸບຕາມສີນຄ້າ','By product'],
  days:['ວັນ','days'], days_left:['ເຫຼືອ','left'],
  select_prod:['— ເລືອກສີນຄ້າ —','— select product —'],
  select_cust:['— ເລືອກລູກຄ້າ —','— select customer —'],
  select_sup:['— ເລືອກຜູ້ສະໜອງ —','— select supplier —'],
  select_wh:['— ເລືອກສາງ —','— select warehouse —'],
  cust:['ລູກຄ້າ','Customer'], sup:['ຜູ້ສະໜອງ','Supplier'],
  inv_title:['ໃບບິນຂາຍ','SALES INVOICE'], quo_title:['ໃບສະເໜີລາຄາ','QUOTATION'],
  rcpt_title:['ໃບຮັບເງິນ','OFFICIAL RECEIPT'], lots_of:['Lot ຂອງ','Lots of'],
  nolot:['ບໍ່ລະບຸ Lot','no lot'],

  paid:['ຊຳລະຄົບ','Paid'], unpaid:['ຍັງບໍ່ຊຳລະ','Unpaid'], partial:['ຊຳລະບາງສ່ວນ','Partial'],
  outstanding:['ຄ້າງຊຳລະ','Outstanding'], amount:['ຈຳນວນເງິນ','Amount'],
  method:['ຮູບແບບຊຳລະ','Payment method'], cash:['ເງິນສົດ','Cash'],
  bank_tr:['ໂອນຜ່ານທະນາຄານ','Bank transfer'], cheque:['ເຊັກ','Cheque'],
  ref_no:['ເລກອ້າງອີງ','Reference no.'], in_words:['ຈຳນວນເງິນເປັນຕົວໜັງສື','Amount in words'],
  against_inv:['ຊຳລະຄ່າບິນ','Applied to invoices'], kip_only:['ກີບຖ້ວນ','Kip only'],
  no_outstanding:['ລູກຄ້ານີ້ບໍ່ມີບິນຄ້າງຊຳລະ','This customer has no unpaid invoices'],
  received_from:['ໄດ້ຮັບເງິນຈາກ','Received from'], receiver:['ຜູ້ຮັບເງິນ','Received by'],

  import_excel:['ນຳເຂົ້າຈາກ Excel','Import from Excel'],
  imp_step1:['ເລືອກໄຟລ໌ Excel ຫຼື CSV','Choose an Excel or CSV file'],
  imp_step2:['ຈັບຄູ່ຄໍລຳ','Match the columns'],
  imp_step3:['ກວດເບິ່ງ ແລະ ນຳເຂົ້າ','Check and import'],
  template:['ດາວໂຫຼດແບບຟອມ','Download template'], ignore:['— ບໍ່ໃຊ້ —','— ignore —'],
  sheet:['ແຜ່ນງານ','Sheet'], rows_found:['ພົບແຖວ','rows found'],
  new_items:['ສີນຄ້າໃໝ່','New'], upd_items:['ອັບເດດ','Update'],
  opening:['ສະຕັອກເປີດ','Opening stock'], do_import:['ນຳເຂົ້າ','Import'],
  imp_done:['ນຳເຂົ້າສຳເລັດ','Import finished'], imp_err:['ອ່ານໄຟລ໌ບໍ່ໄດ້','Could not read the file'],
  imp_hint:['ຕ້ອງມີຢ່າງໜ້ອຍຄໍລຳ "ລະຫັດ" ຫຼື "ຊື່ສີນຄ້າ" — ຄໍລຳອື່ນເລືອກໄດ້ຕາມໃຈ','At least a code or a name column is required — everything else is optional'],

  sync_on:['ຊິງຄ໌ເປີດຢູ່','Synced'], sync_off:['ເກັບໃນເຄື່ອງນີ້ເທົ່ານັ້ນ','This device only'],
  sync_now:['ຊິງຄ໌ດຽວນີ້','Sync now'], last_sync:['ຊິງຄ໌ຫຼ້າສຸດ','Last sync'],
  pending:['ລໍຖ້າສົ່ງ','Waiting to send'], device:['ຊື່ເຄື່ອງ','Device name'],
  save_conn:['ບັນທຶກ & ທົດສອບ','Save & test'], share_link:['ລິ້ງຕັ້ງຄ່າສຳລັບເຄື່ອງອື່ນ','Setup link for other devices'],
  copy:['ສຳເນົາ','Copy'], copied:['ສຳເນົາແລ້ວ','Copied'],
  install_app:['ຕິດຕັ້ງແອັບ','Install app'], backup:['ສຳຮອງ & ກູ້ຄືນ','Backup & restore'],
  exp_json:['ສົ່ງອອກໄຟລ໌ສຳຮອງ','Export backup'], imp_json:['ກູ້ຄືນຈາກໄຟລ໌','Restore from file'],
  demo:['ໃສ່ຂໍ້ມູນຕົວຢ່າງ','Load sample data'], wipe:['ລຶບຂໍ້ມູນໃນເຄື່ອງນີ້','Clear data on this device'],
  cfg_loaded:['ຕັ້ງຄ່າການເຊື່ອມຕໍ່ແລ້ວ','Connection configured'],
  local_only:['ຂໍ້ມູນເກັບໃນເຄື່ອງນີ້ເທົ່ານັ້ນ — ເປີດໜ້າ “ຊິງຄ໌ & ຕິດຕັ້ງ” ເພື່ອແຊກັບທີມ','Data is stored on this device only — open “Sync & Install” to share it with your team'],
};
const t = k => (D[k] ? D[k][lang==='la'?0:1] : k);
const both = k => D[k] ? (D[k][0]+' / '+D[k][1]) : k;

/* ---------------- state ---------------- */
const COLLS=['products','lots','partners','invoices','quotes','receipts','warehouses','transfers'];
const S={ settings:{} }; COLLS.forEach(c=>S[c]=[]);
let route='dash', modal=null, draft=null;
const ui={ pSearch:'', invFilter:'all', quoFilter:'all', partFilter:'all', whFilter:'', repMonth:ym(new Date()) };

const DEF_SETTINGS={
  companyLa:'ຮ້ານ PBSM ອິເລັກໂທຼນິກ', companyEn:'PBSM Electronics',
  address:'', phone:'', taxId:'', bank:'', logo:'', rateUSD:21500, vat:10
};
const st = () => Object.assign({}, DEF_SETTINGS, S.settings||{});

/* ---------------- helpers ---------------- */
function ym(d){ return d.toISOString().slice(0,7); }
function today(){ return new Date().toISOString().slice(0,10); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function n(v){ const x=parseFloat(String(v).replace(/,/g,'')); return isFinite(x)?x:0; }
function fmtK(v){ return Math.round(n(v)).toLocaleString('en-US'); }
function fmtUSD(v){ return n(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function toUSD(lak){ const r=n(st().rateUSD)||1; return n(lak)/r; }
function moneyBoth(lak){ return '<span class="num">'+fmtK(lak)+' ₭</span> <span class="sub2 num">($'+fmtUSD(toUSD(lak))+')</span>'; }
function daysTo(d){ if(!d) return null; return Math.round((new Date(d+'T00:00:00')-new Date(today()+'T00:00:00'))/86400000); }
function uid(p){ return p+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function nowISO(){ return new Date().toISOString(); }
function toast(msg){ const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2600); }

function prod(id){ return S.products.find(p=>p.id===id); }
function partner(id){ return S.partners.find(p=>p.id===id); }
function wh(id){ return S.warehouses.find(w=>w.id===id); }
function whName(id){ const w=wh(id); if(!w) return '—'; return lang==='la'?(w.nameLa||w.nameEn||w.code):(w.nameEn||w.nameLa||w.code); }
function pname(p){ if(!p) return ''; return lang==='la' ? (p.nameLa||p.nameEn||'') : (p.nameEn||p.nameLa||''); }
function pnameBoth(p){ if(!p) return ''; const a=p.nameLa||'', b=p.nameEn||''; return a&&b&&a!==b ? a+' / '+b : (a||b); }
function onHand(pid, whId){ return S.lots.filter(l=>l.productId===pid && (!whId||l.warehouseId===whId)).reduce((s,l)=>s+n(l.remaining),0); }
function stockState(p){ const q=onHand(p.id); if(q<=0) return 'out'; if(q<=n(p.reorder)) return 'low'; return 'ok'; }
function lotsFEFO(pid, whId){
  return S.lots.filter(l=>l.productId===pid && n(l.remaining)>0 && (!whId||l.warehouseId===whId))
    .sort((a,b)=>String(a.expiry||'9999-12-31').localeCompare(String(b.expiry||'9999-12-31')));
}
function stockValue(whId){ return S.lots.filter(l=>!whId||l.warehouseId===whId).reduce((s,l)=>s+n(l.remaining)*n(l.cost),0); }

/* shop logo — stored in settings as a data URI, shown in the sidebar and on every printed document */
function hasLogo(){ return !!(st().logo); }
function logoImg(px, extra){
  return hasLogo() ? '<img src="'+esc(st().logo)+'" alt="" style="height:'+px+'px;width:auto;max-width:'+Math.round(px*3.2)+'px;object-fit:contain;'+(extra||'')+'">' : '';
}
function initials(){
  const s=st();
  const src=(s.companyEn||s.companyLa||'').replace(/[^A-Za-z0-9 ]/g,' ').trim();
  if(!src) return '◆';
  const w=src.split(/\s+/).filter(Boolean);
  const txt=(w.length>1 ? w[0][0]+w[1][0] : w[0].slice(0,2));
  return txt.toUpperCase();
}
/* shrink an uploaded image so it fits comfortably inside one settings document */
function readLogo(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onerror=()=>rej(new Error('read'));
    fr.onload=()=>{
      const im=new Image();
      im.onerror=()=>rej(new Error('image'));
      im.onload=()=>{
        const max=320, sc=Math.min(1, max/Math.max(im.width,im.height));
        const w=Math.max(1,Math.round(im.width*sc)), h=Math.max(1,Math.round(im.height*sc));
        const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
        cv.getContext('2d').drawImage(im,0,0,w,h);
        let out=cv.toDataURL('image/png');
        if(out.length>180000) out=cv.toDataURL('image/jpeg',0.85);
        res(out);
      };
      im.src=fr.result;
    };
    fr.readAsDataURL(file);
  });
}

function docTotals(d){
  const s=st(), items=d.items||[];
  let sub=0; items.forEach(i=>{ sub += n(i.qty)*n(i.price)*(1-n(i.discount)/100); });
  const vat = sub * (n(d.vat!=null?d.vat:s.vat)/100);
  return { sub, vat, grand: sub+vat };
}
function paidFor(invId){
  let p=0;
  S.receipts.forEach(r=>{ if(r.voided) return; (r.items||[]).forEach(it=>{ if(it.invoiceId===invId) p+=n(it.amount); }); });
  return p;
}
function outstanding(inv){ return Math.max(0, docTotals(inv).grand - paidFor(inv.id)); }
function payState(inv){
  if(inv.status!=='issued') return null;
  const o=outstanding(inv); const g=docTotals(inv).grand;
  if(o<=0.5) return 'paid'; if(o>=g-0.5) return 'unpaid'; return 'partial';
}
function totalReceivable(){ return S.invoices.filter(i=>i.status==='issued').reduce((s,i)=>s+outstanding(i),0); }
function nextNo(prefix, list){
  const m=ym(new Date()).replace('-','');
  let mx=0; list.forEach(x=>{ const s=String(x.no||''); if(s.indexOf(prefix+'-'+m)===0){ const p=+s.split('-').pop(); if(p>mx) mx=p; } });
  return prefix+'-'+m+'-'+String(mx+1).padStart(4,'0');
}

/* Lao reading of an amount, for receipts */
const LAO_D=['ສູນ','ໜຶ່ງ','ສອງ','ສາມ','ສີ່','ຫ້າ','ຫົກ','ເຈັດ','ແປດ','ເກົ້າ'];
const LAO_P=['','ສິບ','ຮ້ອຍ','ພັນ','ໝື່ນ','ແສນ'];
function laoNumWords(num){
  num=Math.round(n(num));
  if(num===0) return LAO_D[0];
  if(num>=1000000){
    const m=Math.floor(num/1000000), rest=num%1000000;
    return laoNumWords(m)+'ລ້ານ'+(rest?laoNumWords(rest):'');
  }
  const s=String(num); let out='';
  for(let i=0;i<s.length;i++){
    const d=+s[i], place=s.length-1-i;
    if(d===0) continue;
    if(place===1){ out += (d===1?'':(d===2?'ຊາວ':LAO_D[d]))+(d===2?'':'ສິບ'); }
    else if(place===0){ out += (d===1 && s.length>1 && +s[s.length-2]!==0) ? 'ເອັດ' : LAO_D[d]; }
    else out += LAO_D[d]+LAO_P[place];
  }
  return out;
}

/* ============================================================
   STORAGE — artifact database, or local + Supabase sync
   ============================================================ */
let renderTimer=null;
function scheduleRender(){ clearTimeout(renderTimer); renderTimer=setTimeout(render,30); }
function lsGet(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){ toast('⚠ storage full'); } }

let adb=null, artifactReady=false;
let Docs={}, meta={lastSync:''}, cfg={url:'',key:'',device:''};
const sync={busy:false, err:'', at:'', ok:false};
let deferredInstall=null;

function cfgOk(){ return !!(cfg.url && cfg.key); }
function pendingCount(){ return Object.values(Docs).filter(d=>d.dirty).length; }
function connected(){ return MODE==='artifact' ? artifactReady : (cfgOk() && sync.ok); }

function rebuild(){
  S.settings={}; COLLS.forEach(c=>S[c]=[]);
  Object.values(Docs).forEach(d=>{
    if(d.deleted) return;
    if(d.coll==='settings'){ S.settings=d.data||{}; return; }
    if(S[d.coll]) S[d.coll].push(Object.assign({id:d.id}, d.data));
  });
}
function persist(){ lsSet(DATA_KEY,{docs:Docs,meta}); }

async function putDoc(coll,id,data){
  const clean=Object.assign({},data); delete clean.id;
  if(MODE==='artifact'){
    if(!adb){ toast('⚠ database unavailable'); return id; }
    try{ await adb.collection(coll).doc(id).set(clean); }catch(e){ toast('⚠ '+(e.message||'write failed')); }
    return id;
  }
  Docs[id]={id,coll,data:clean,deleted:false,updated_at:nowISO(),dirty:true};
  persist(); rebuild(); scheduleRender(); queueSync(); return id;
}
async function delDoc(coll,id){
  if(MODE==='artifact'){
    if(!adb) return;
    try{ await adb.collection(coll).doc(id).delete(); }catch(e){ toast('⚠ '+(e.message||'delete failed')); }
    return;
  }
  const d=Docs[id]; if(!d) return;
  Docs[id]={id,coll,data:d.data,deleted:true,updated_at:nowISO(),dirty:true};
  persist(); rebuild(); scheduleRender(); queueSync();
}
async function putSettings(obj){
  const merged=Object.assign({},st(),obj);
  if(MODE==='artifact'){
    S.settings=merged;
    if(adb){ try{ await adb.doc('settings/app').set(merged); }catch(e){ toast('⚠ '+(e.message||'write failed')); } }
    scheduleRender(); return;
  }
  Docs['settings-app']={id:'settings-app',coll:'settings',data:merged,deleted:false,updated_at:nowISO(),dirty:true};
  persist(); rebuild(); scheduleRender(); queueSync();
}

/* ---- Supabase sync (PWA mode) ---- */
function SH(){ return {apikey:cfg.key, Authorization:'Bearer '+cfg.key, 'Content-Type':'application/json'}; }
let syncTimer=null;
function queueSync(){ if(!cfgOk()) return; clearTimeout(syncTimer); syncTimer=setTimeout(()=>syncNow(),1200); }
async function syncNow(silent){
  if(MODE!=='pwa' || !cfgOk() || sync.busy) return;
  if(!navigator.onLine){ sync.err='offline'; sync.ok=false; scheduleRender(); return; }
  sync.busy=true; scheduleRender();
  try{
    const dirty=Object.values(Docs).filter(d=>d.dirty);
    if(dirty.length){
      const body=dirty.map(d=>({id:d.id,coll:d.coll,data:d.data,deleted:!!d.deleted,updated_at:d.updated_at}));
      const r=await fetch(cfg.url+'/rest/v1/cbf_docs?on_conflict=id',{method:'POST',
        headers:Object.assign(SH(),{Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(body)});
      if(!r.ok) throw new Error('push '+r.status+' — '+(await r.text()).slice(0,160));
      dirty.forEach(d=>{ if(Docs[d.id]) Docs[d.id].dirty=false; });
    }
    let since=meta.lastSync||'1970-01-01T00:00:00Z', guard=0;
    while(guard++<20){
      const url=cfg.url+'/rest/v1/cbf_docs?select=*&updated_at=gt.'+encodeURIComponent(since)+'&order=updated_at.asc&limit=500';
      const r2=await fetch(url,{headers:SH()});
      if(!r2.ok) throw new Error('pull '+r2.status+' — '+(await r2.text()).slice(0,160));
      const rows=await r2.json();
      rows.forEach(row=>{
        const cur=Docs[row.id];
        if(cur && cur.dirty) return;
        if(!cur || Date.parse(row.updated_at)>=Date.parse(cur.updated_at))
          Docs[row.id]={id:row.id,coll:row.coll,data:row.data||{},deleted:!!row.deleted,updated_at:row.updated_at,dirty:false};
      });
      if(rows.length) since=rows[rows.length-1].updated_at;
      if(rows.length<500) break;
    }
    meta.lastSync=since;
    sync.err=''; sync.ok=true; sync.at=nowISO();
    persist(); rebuild();
  }catch(e){ sync.err=String(e.message||e); sync.ok=false; if(!silent) console.warn(e); }
  sync.busy=false; scheduleRender();
}

function b64enc(str){ const b=new TextEncoder().encode(str); let s=''; b.forEach(x=>s+=String.fromCharCode(x)); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function b64dec(str){ const bin=atob(str.replace(/-/g,'+').replace(/_/g,'/')); return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0))); }
function setupLink(){
  const base=location.origin+location.pathname;
  return base+'#cfg='+b64enc(JSON.stringify({u:cfg.url,k:cfg.key}));
}

async function initStore(){
  if(MODE==='artifact'){
    try{ adb = await claude.use('db'); }catch(e){ adb=null; }
    if(!adb){ scheduleRender(); return; }
    artifactReady=true;
    adb.doc('settings/app').onSnapshot(s=>{ S.settings = s.exists? s.data() : {}; scheduleRender(); }, ()=>{});
    COLLS.forEach(c=>adb.collection(c).onSnapshot(q=>{
      S[c]=q.docs.map(d=>Object.assign({id:d.id}, d.data())); scheduleRender();
    }, ()=>{}));
    scheduleRender();
    return;
  }
  cfg=lsGet(CFG_KEY,{url:'',key:'',device:''});
  const saved=lsGet(DATA_KEY,{docs:{},meta:{lastSync:''}});
  Docs=saved.docs||{}; meta=saved.meta||{lastSync:''};
  const m=/[#&]cfg=([A-Za-z0-9_\-]+)/.exec(location.hash||'');
  if(m){
    try{ const j=JSON.parse(b64dec(m[1]));
      cfg={url:(j.u||'').replace(/\/+$/,''), key:j.k||'', device:cfg.device||''};
      lsSet(CFG_KEY,cfg);
      history.replaceState(null,'',location.pathname+location.search);
      setTimeout(()=>toast('✓ '+t('cfg_loaded')),400);
    }catch(e){}
  }
  rebuild(); render();
  if(cfgOk()) syncNow(true);
  setInterval(()=>{ if(!document.hidden) syncNow(true); }, 20000);
  window.addEventListener('online', ()=>syncNow(true));
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) syncNow(true); });
}

/* ============================================================
   NAV
   ============================================================ */
const ROUTES=[
  ['grp_stock'],['dash','▤','nav_dash'],['prod','▣','nav_prod'],['in','⇩','nav_in'],['wh','⌗','nav_wh'],
  ['grp_sell'],['inv','▦','nav_inv'],['quo','✎','nav_quo'],['rcpt','₭','nav_rcpt'],['part','☎','nav_part'],
  ['grp_sys'],['rep','◷','nav_rep'],['set','⚙','nav_set']
];
function navItems(){
  const r=ROUTES.slice();
  if(MODE==='pwa') r.push(['sync','⇅','nav_sync']);
  return r;
}
function renderNav(){
  const lowN=S.products.filter(p=>stockState(p)!=='ok').length;
  const expN=S.lots.filter(l=>n(l.remaining)>0 && l.expiry && daysTo(l.expiry)<=90).length;
  const unpaidN=S.invoices.filter(i=>i.status==='issued' && payState(i)!=='paid').length;
  const s=st();
  const cls = sync.busy?'busy':(connected()?'':'off');
  const txt = MODE==='artifact'
      ? (artifactReady?'ຖານຂໍ້ມູນກາງ / shared':'ບໍ່ເຊື່ອມຕໍ່ / offline')
      : (!cfgOk()? t('sync_off') : sync.busy? '...' : sync.ok? t('sync_on') : (sync.err?'⚠ '+t('sync_off'):t('sync_off')));
  document.getElementById('nav').innerHTML=`
    <div class="brandmark">
      ${hasLogo() ? `<div class="logo">${logoImg(34)}</div>` : `<div class="dot">${esc(initials())}</div>`}
      <div><b>${esc(lang==='la'?s.companyLa:s.companyEn)}</b><small>stock &amp; billing</small></div></div>
    ${navItems().map(row=>{
      if(row.length===1) return `<div class="navsep">${esc(t(row[0]))}</div>`;
      const [k,ic,lbl]=row;
      const cnt = k==='prod'&&lowN?lowN : k==='in'&&expN?expN : k==='rcpt'&&unpaidN?unpaidN : 0;
      return `<button class="navbtn" data-route="${k}" aria-current="${route===k}">
        <span class="ic">${ic}</span><span>${esc(t(lbl))}</span>
        ${cnt?`<span class="cnt">${cnt}</span>`:''}</button>`;
    }).join('')}
    <div class="navfoot">
      <div class="langtoggle">
        <button data-lang="la" aria-pressed="${lang==='la'}">ລາວ</button>
        <button data-lang="en" aria-pressed="${lang==='en'}">EN</button>
      </div>
      <div class="conn ${cls}" ${MODE==='pwa'?'data-route="sync"':''}><i></i><span>${esc(txt)}</span></div>
    </div>`;
}
function head(title,sub,tools){
  return `<div class="pagehead"><div><h1>${esc(t(title))}</h1><p>${esc(t(sub))}</p></div><div class="tools">${tools||''}</div></div>`;
}
function whOptions(sel,anyLabel){
  return (anyLabel?`<option value="">${esc(anyLabel)}</option>`:'')
    + S.warehouses.map(w=>`<option value="${w.id}" ${sel===w.id?'selected':''}>${esc(w.code?w.code+' — ':'')}${esc(whName(w.id))}</option>`).join('');
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function viewDash(){
  const low=S.products.filter(p=>stockState(p)!=='ok');
  const lots=S.lots.filter(l=>n(l.remaining)>0 && l.expiry).map(l=>Object.assign({d:daysTo(l.expiry)},l)).filter(l=>l.d<=90).sort((a,b)=>a.d-b.d);
  const mth=ym(new Date());
  const issued=S.invoices.filter(i=>i.status==='issued');
  const monthSales=issued.filter(i=>String(i.date||'').startsWith(mth)).reduce((a,i)=>a+docTotals(i).grand,0);
  const months=[]; const now=new Date();
  for(let k=5;k>=0;k--) months.push(new Date(now.getFullYear(),now.getMonth()-k,1).toISOString().slice(0,7));
  const series=months.map(m=>({m, v: issued.filter(i=>String(i.date||'').startsWith(m)).reduce((a,i)=>a+docTotals(i).grand,0)}));
  const rec=totalReceivable();

  return head('nav_dash','sub_dash',
      `<button class="btn primary" data-act="new-inv">${esc(t('add_inv'))}</button>
       <button class="btn" data-act="new-rcpt">${esc(t('add_rcpt'))}</button>
       <button class="btn" data-act="new-in">${esc(t('add_in'))}</button>`)
  + `<div class="stats">
      <div class="stat"><div class="k">${esc(t('stock_value'))}</div><div class="v">${fmtK(stockValue())} ₭</div>
        <div class="u">$${fmtUSD(toUSD(stockValue()))} · ${S.products.length} ${lang==='la'?'ລາຍການ':'items'}</div></div>
      <div class="stat"><div class="k">${esc(t('sales_month'))}</div><div class="v">${fmtK(monthSales)} ₭</div>
        <div class="u">${mth} · ${issued.filter(i=>String(i.date||'').startsWith(mth)).length} ${esc(t('invoices_n'))}</div></div>
      <div class="stat ${rec>0?'caution':''}"><div class="k">${esc(t('receivable'))}</div><div class="v">${fmtK(rec)} ₭</div>
        <div class="u">${S.invoices.filter(i=>i.status==='issued'&&payState(i)!=='paid').length} ${esc(t('invoices_n'))}</div></div>
      <div class="stat ${low.length?'alert':''}"><div class="k">${esc(t('low_stock'))}</div><div class="v">${low.length}</div>
        <div class="u">${esc(t('need_reorder'))}</div></div>
    </div>`
  + `<div class="panel" style="margin-bottom:18px">
      <header><h2>${esc(t('monthly_sales'))}</h2><span class="sub">₭ ${lang==='la'?'ລວມ VAT':'incl. VAT'}</span></header>
      <div class="chartwrap">${barChart(series)}</div></div>`
  + (S.warehouses.length?`<div class="panel" style="margin-bottom:18px">
      <header><h2>${esc(t('by_wh'))}</h2><span class="sub">${S.warehouses.length} ${esc(t('warehouse'))}</span></header>
      <div class="tablewrap"><table><thead><tr><th>${esc(t('warehouse'))}</th>
        <th class="r">${esc(t('items'))}</th><th class="r">${esc(t('stock_value'))}</th></tr></thead>
        <tbody>${S.warehouses.map(w=>{
          const ls=S.lots.filter(l=>l.warehouseId===w.id && n(l.remaining)>0);
          const kinds=new Set(ls.map(l=>l.productId)).size;
          return `<tr><td><b>${esc(whName(w.id))}</b> <span class="sub2 mono">${esc(w.code||'')}</span></td>
            <td class="r num">${kinds}</td><td class="r num">${fmtK(stockValue(w.id))} ₭</td></tr>`;}).join('')}
        </tbody></table></div></div>`:'')
  + `<div class="grid2" style="align-items:start">
      <div class="panel"><header><h2>${esc(t('need_reorder'))}</h2><span class="sub">${low.length}</span></header>
        <div class="tablewrap"><table>
          <thead><tr><th>${esc(t('code'))}</th><th>${esc(t('name'))}</th><th class="r">${esc(t('stock'))}</th><th>${esc(t('status'))}</th></tr></thead>
          <tbody>${low.length?low.map(p=>{const stt=stockState(p);return `<tr>
            <td class="mono">${esc(p.code)}</td><td>${esc(pname(p))}</td>
            <td class="r num">${fmtK(onHand(p.id))} <span class="sub2">/ ${fmtK(p.reorder)}</span></td>
            <td><span class="tag ${stt==='out'?'bad':'warn'}">${esc(t(stt==='out'?'out':'low'))}</span></td></tr>`}).join('')
            :`<tr><td colspan="4" class="empty">✓ ${lang==='la'?'ສີນຄ້າທຸກລາຍການພຽງພໍ':'All items above reorder point'}</td></tr>`}</tbody>
        </table></div></div>
      <div class="panel"><header><h2>${esc(t('expiry_watch'))}</h2><span class="sub">≤ 90 ${esc(t('days'))}</span></header>
        <div class="tablewrap"><table>
          <thead><tr><th>${esc(t('name'))}</th><th class="mono">Lot</th><th>${esc(t('expiry'))}</th><th class="r">${esc(t('remain'))}</th></tr></thead>
          <tbody>${lots.length?lots.slice(0,10).map(l=>`<tr>
            <td>${esc(pname(prod(l.productId)))}<div class="sub2">${esc(whName(l.warehouseId))}</div></td>
            <td class="mono">${esc(l.lotNo||'—')}</td>
            <td>${esc(l.expiry)} <span class="tag ${l.d<0?'bad':'warn'}">${l.d<0?esc(t('expired')):esc(t('days_left'))+' '+l.d+' '+esc(t('days'))}</span></td>
            <td class="r num">${fmtK(l.remaining)}</td></tr>`).join('')
            :`<tr><td colspan="4" class="empty">✓ ${lang==='la'?'ບໍ່ມີ Lot ໃກ້ໝົດອາຍຸ':'No lots expiring soon'}</td></tr>`}</tbody>
        </table></div></div>
    </div>`
  + `<div class="panel" style="margin-top:18px">
      <header><h2>${esc(t('recent_inv'))}</h2><button class="btn sm ghost" data-route="inv">${esc(t('all'))} →</button></header>
      ${invoiceTable(S.invoices.slice().sort(byDateDesc).slice(0,6),'inv')}</div>`;
}
function byDateDesc(a,b){ return String(b.date||'').localeCompare(String(a.date||'')) || String(b.no||'').localeCompare(String(a.no||'')); }

function barChart(series){
  const W=Math.max(520, series.length*94), H=190, padL=64, padR=14, padT=14, padB=34;
  const max=Math.max(0, ...series.map(d=>d.v));
  const nice=max>0?Math.pow(10,Math.floor(Math.log10(max))):0;
  const top=max>0?Math.ceil(max/nice)*nice:0;
  const iw=W-padL-padR, ih=H-padT-padB;
  const bw=Math.min(54, iw/series.length*0.6);
  const ticks=top>0?[0,top/2,top]:[0];
  const grid=ticks.map(v=>{ const y=padT+ih-(top?ih*v/top:0);
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="1"></line>
    <text x="${padL-8}" y="${(y+3.5).toFixed(1)}" text-anchor="end" font-size="10.5" fill="var(--muted)" font-family="var(--mono)">${v>=1000?fmtK(v/1000)+'k':fmtK(v)}</text>`;}).join('');
  const bars=series.map((d,i)=>{
    const x=padL + iw*(i+0.5)/series.length - bw/2;
    const h=top?ih*d.v/top:0, y=padT+ih-h;
    return `<g class="bar"><title>${d.m}: ${fmtK(d.v)} ₭</title>
      <rect x="${x.toFixed(1)}" y="${(h>0?y:padT+ih-1).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h,1).toFixed(1)}" rx="4" fill="var(--brand)"></rect>
      ${d.v>0?`<text x="${(x+bw/2).toFixed(1)}" y="${(y-5).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="var(--ink2)" font-family="var(--mono)">${fmtK(d.v/1000)}k</text>`:''}
      <text x="${(x+bw/2).toFixed(1)}" y="${H-12}" text-anchor="middle" font-size="11" fill="var(--muted)">${d.m.slice(2).replace('-','/')}</text></g>`;}).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" style="min-width:${W}px;max-width:100%">${grid}${bars}</svg>`;
}

/* ============================================================
   PRODUCTS  (+ Excel import)
   ============================================================ */
function viewProd(){
  const q=ui.pSearch.toLowerCase();
  const list=S.products.filter(p=>!q || [p.code,p.nameLa,p.nameEn,p.category].join(' ').toLowerCase().includes(q))
    .sort((a,b)=>String(a.code).localeCompare(String(b.code)));
  const whF=ui.whFilter;
  return head('nav_prod','sub_prod',
    `<input type="text" id="psearch" placeholder="${esc(t('search'))}" value="${esc(ui.pSearch)}" style="width:180px">
     ${S.warehouses.length?`<select id="whfilter" style="width:170px"><option value="">${esc(t('all_wh'))}</option>${whOptions(whF,null)}</select>`:''}
     <button class="btn" data-act="import-open">${esc(t('import_excel'))}</button>
     <button class="btn primary" data-act="new-prod">${esc(t('add_prod'))}</button>`)
  + `<div class="panel"><div class="tablewrap"><table>
      <thead><tr><th>${esc(t('code'))}</th><th>${esc(t('name'))}</th><th>${esc(t('category'))}</th>
      <th class="r">${esc(t('stock'))}${whF?' · '+esc(whName(whF)):''}</th><th class="r">${esc(t('reorder'))}</th>
      <th class="r">${esc(t('cost'))}</th><th class="r">${esc(t('price'))}</th>
      <th>${esc(t('status'))}</th><th class="r">${esc(t('act'))}</th></tr></thead>
      <tbody>${list.length?list.map(p=>{
        const stt=stockState(p), q2=onHand(p.id, whF||null);
        return `<tr>
          <td class="mono">${esc(p.code)}</td>
          <td><div>${esc(pname(p))}</div><div class="sub2">${esc(lang==='la'?(p.nameEn||''):(p.nameLa||''))}</div></td>
          <td class="sub2">${esc(p.category||'—')}</td>
          <td class="r num"><b>${fmtK(q2)}</b> <span class="sub2">${esc(p.unit||'')}</span></td>
          <td class="r num sub2">${fmtK(p.reorder)}</td>
          <td class="r num sub2">${fmtK(p.cost)}</td>
          <td class="r num">${fmtK(p.price)}</td>
          <td><span class="tag ${stt==='out'?'bad':stt==='low'?'warn':'ok'}">${esc(t(stt==='out'?'out':stt==='low'?'low':'ok_stock'))}</span></td>
          <td class="r" style="white-space:nowrap">
            <button class="btn sm ghost" data-act="lots" data-id="${p.id}">Lot</button>
            <button class="btn sm ghost" data-act="edit-prod" data-id="${p.id}">${esc(t('edit'))}</button>
            <button class="btn sm ghost" data-act="del-prod" data-id="${p.id}">✕</button></td></tr>`;}).join('')
        :`<tr><td colspan="9" class="empty">${esc(t('none'))}</td></tr>`}</tbody>
    </table></div></div>`;
}

/* ============================================================
   STOCK IN
   ============================================================ */
function viewIn(){
  const list=S.lots.slice().sort((a,b)=>String(b.dateIn||'').localeCompare(String(a.dateIn||'')));
  return head('nav_in','sub_in',`<button class="btn primary" data-act="new-in">${esc(t('add_in'))}</button>`)
  + `<div class="panel"><div class="tablewrap"><table>
    <thead><tr><th>${esc(t('date'))}</th><th>${esc(t('name'))}</th><th>Lot</th><th>${esc(t('expiry'))}</th>
    <th>${esc(t('warehouse'))}</th><th class="r">${esc(t('received'))}</th><th class="r">${esc(t('remain'))}</th>
    <th class="r">${esc(t('cost'))}</th><th>${esc(t('supplier'))}</th><th class="r">${esc(t('act'))}</th></tr></thead>
    <tbody>${list.length?list.map(l=>{
      const p=prod(l.productId), d=l.expiry?daysTo(l.expiry):null;
      return `<tr>
        <td class="mono">${esc(l.dateIn||'')}</td>
        <td>${esc(pname(p)||'—')}</td>
        <td class="mono">${esc(l.lotNo||'—')}</td>
        <td>${l.expiry?esc(l.expiry)+(d<=90?` <span class="tag ${d<0?'bad':'warn'}">${d<0?esc(t('expired')):d+' '+esc(t('days'))}</span>`:''):'<span class="sub2">—</span>'}</td>
        <td class="sub2">${esc(whName(l.warehouseId))}</td>
        <td class="r num sub2">${fmtK(l.qty)}</td>
        <td class="r num"><b>${fmtK(l.remaining)}</b> <span class="sub2">${esc(p&&p.unit||'')}</span></td>
        <td class="r num sub2">${fmtK(l.cost)}</td>
        <td class="sub2">${esc((partner(l.supplierId)||{}).name||'—')}</td>
        <td class="r" style="white-space:nowrap">
          <button class="btn sm ghost" data-act="edit-lot" data-id="${l.id}">${esc(t('edit'))}</button>
          <button class="btn sm ghost" data-act="del-lot" data-id="${l.id}">✕</button></td></tr>`;}).join('')
      :`<tr><td colspan="10" class="empty">${esc(t('none'))}</td></tr>`}</tbody>
  </table></div></div>`;
}

/* ============================================================
   WAREHOUSES + TRANSFERS
   ============================================================ */
function viewWh(){
  const trs=S.transfers.slice().sort(byDateDesc);
  return head('nav_wh','sub_wh',
    `<button class="btn" data-act="new-wh">${esc(t('add_wh'))}</button>
     <button class="btn primary" data-act="new-transfer" ${S.warehouses.length<2?'disabled':''}>${esc(t('new_transfer'))}</button>`)
  + `<div class="panel" style="margin-bottom:18px">
      <header><h2>${esc(t('nav_wh'))}</h2><span class="sub">${S.warehouses.length}</span></header>
      <div class="tablewrap"><table>
        <thead><tr><th>${esc(t('code'))}</th><th>${esc(t('name'))}</th><th>${esc(t('address'))}</th>
        <th class="r">${esc(t('items'))}</th><th class="r">${esc(t('stock_value'))}</th><th class="r">${esc(t('act'))}</th></tr></thead>
        <tbody>${S.warehouses.length?S.warehouses.map(w=>{
          const ls=S.lots.filter(l=>l.warehouseId===w.id && n(l.remaining)>0);
          return `<tr><td class="mono">${esc(w.code||'')}</td>
            <td><b>${esc(whName(w.id))}</b><div class="sub2">${esc(lang==='la'?(w.nameEn||''):(w.nameLa||''))}</div></td>
            <td class="sub2">${esc(w.address||'—')}</td>
            <td class="r num">${new Set(ls.map(l=>l.productId)).size}</td>
            <td class="r num">${fmtK(stockValue(w.id))} ₭</td>
            <td class="r" style="white-space:nowrap">
              <button class="btn sm ghost" data-act="edit-wh" data-id="${w.id}">${esc(t('edit'))}</button>
              <button class="btn sm ghost" data-act="del-wh" data-id="${w.id}">✕</button></td></tr>`;}).join('')
          :`<tr><td colspan="6" class="empty">${esc(t('none'))}</td></tr>`}</tbody>
      </table></div></div>
    <div class="panel"><header><h2>${esc(t('transfers'))}</h2><span class="sub">${trs.length}</span></header>
      <div class="tablewrap"><table>
        <thead><tr><th>${esc(t('date'))}</th><th>${esc(t('name'))}</th><th>Lot</th>
        <th>${esc(t('from_wh'))}</th><th>${esc(t('to_wh'))}</th><th class="r">${esc(t('qty'))}</th><th>${esc(t('note'))}</th></tr></thead>
        <tbody>${trs.length?trs.map(x=>`<tr>
          <td class="mono">${esc(x.date||'')}</td><td>${esc(pname(prod(x.productId))||x.productName||'—')}</td>
          <td class="mono">${esc(x.lotNo||'—')}</td>
          <td class="sub2">${esc(whName(x.fromWh))}</td><td class="sub2">${esc(whName(x.toWh))}</td>
          <td class="r num">${fmtK(x.qty)}</td><td class="sub2">${esc(x.note||'')}</td></tr>`).join('')
          :`<tr><td colspan="7" class="empty">${esc(t('none'))}</td></tr>`}</tbody>
      </table></div></div>`;
}

/* ============================================================
   INVOICES / QUOTATIONS
   ============================================================ */
function invoiceTable(list,kind){
  const isQ=kind==='quo';
  return `<div class="tablewrap"><table>
    <thead><tr><th>${esc(t('no'))}</th><th>${esc(t('date'))}</th><th>${esc(t('customer'))}</th>
    <th class="r">${esc(t('grand'))}</th>${isQ?'':`<th class="r">${esc(t('outstanding'))}</th>`}
    <th>${esc(t('status'))}</th><th class="r">${esc(t('act'))}</th></tr></thead>
    <tbody>${list.length?list.map(d=>{
      const tt=docTotals(d);
      const badge = d.status==='issued'?'ok':d.status==='void'?'bad':d.status==='accepted'?'ok':d.status==='sent'?'info':'mute';
      const label = d.status==='issued'?'issued':d.status==='void'?'voided':d.status==='accepted'?'accepted':d.status==='sent'?'sent':'draft';
      const ps=isQ?null:payState(d), out=isQ?0:outstanding(d);
      return `<tr>
        <td class="mono">${esc(d.no||'')}</td>
        <td class="mono">${esc(d.date||'')}</td>
        <td>${esc(d.customerName||(partner(d.customerId)||{}).name||'—')}
          ${d.warehouseId?`<div class="sub2">${esc(whName(d.warehouseId))}</div>`:''}</td>
        <td class="r">${moneyBoth(tt.grand)}</td>
        ${isQ?'':`<td class="r num">${ps?(out>0?'<b>'+fmtK(out)+'</b> ₭':'<span class="sub2">—</span>'):'<span class="sub2">—</span>'}</td>`}
        <td><span class="tag ${badge}">${esc(t(label))}</span>
          ${ps?` <span class="tag ${ps==='paid'?'ok':ps==='partial'?'warn':'bad'}">${esc(t(ps))}</span>`:''}</td>
        <td class="r" style="white-space:nowrap">
          <button class="btn sm ghost" data-act="print-doc" data-kind="${kind}" data-id="${d.id}">${esc(t('print'))}</button>
          ${isQ&&d.status!=='void'?`<button class="btn sm ghost" data-act="convert" data-id="${d.id}">→ ${esc(t('nav_inv'))}</button>`:''}
          ${!isQ&&d.status==='draft'?`<button class="btn sm" data-act="issue" data-id="${d.id}">${esc(t('issue'))}</button>`:''}
          ${!isQ&&d.status==='issued'&&ps!=='paid'?`<button class="btn sm" data-act="pay-inv" data-id="${d.id}">${esc(t('add_rcpt'))}</button>`:''}
          ${!isQ&&d.status==='issued'?`<button class="btn sm ghost" data-act="void" data-id="${d.id}">${esc(t('voidit'))}</button>`:''}
          ${d.status==='draft'||isQ?`<button class="btn sm ghost" data-act="edit-doc" data-kind="${kind}" data-id="${d.id}">${esc(t('edit'))}</button>`:''}
          <button class="btn sm ghost" data-act="del-doc" data-kind="${kind}" data-id="${d.id}">✕</button>
        </td></tr>`;}).join('')
      :`<tr><td colspan="${isQ?6:7}" class="empty">${esc(t('none'))}</td></tr>`}</tbody></table></div>`;
}
function viewInv(){
  let list=S.invoices.slice().sort(byDateDesc);
  if(ui.invFilter==='unpaid') list=list.filter(i=>i.status==='issued'&&payState(i)!=='paid');
  else if(ui.invFilter!=='all') list=list.filter(i=>(i.status||'draft')===ui.invFilter);
  const f=(k,l)=>`<button class="btn sm ${ui.invFilter===k?'primary':'ghost'}" data-filter="inv" data-val="${k}">${esc(t(l))}</button>`;
  return head('nav_inv','sub_inv',
    `${f('all','all')}${f('draft','draft')}${f('issued','issued')}${f('unpaid','unpaid')}${f('void','voided')}
     <button class="btn primary" data-act="new-inv">${esc(t('add_inv'))}</button>`)
  + `<div class="panel">${invoiceTable(list,'inv')}</div>`;
}
function viewQuo(){
  let list=S.quotes.slice().sort(byDateDesc);
  if(ui.quoFilter!=='all') list=list.filter(i=>(i.status||'draft')===ui.quoFilter);
  const f=(k,l)=>`<button class="btn sm ${ui.quoFilter===k?'primary':'ghost'}" data-filter="quo" data-val="${k}">${esc(t(l))}</button>`;
  return head('nav_quo','sub_quo',
    `${f('all','all')}${f('draft','draft')}${f('sent','sent')}${f('accepted','accepted')}
     <button class="btn primary" data-act="new-quo">${esc(t('add_quo'))}</button>`)
  + `<div class="panel">${invoiceTable(list,'quo')}</div>`;
}

/* ============================================================
   RECEIPTS
   ============================================================ */
function viewRcpt(){
  const list=S.receipts.slice().sort(byDateDesc);
  const openInv=S.invoices.filter(i=>i.status==='issued' && payState(i)!=='paid').sort(byDateDesc);
  return head('nav_rcpt','sub_rcpt',`<button class="btn primary" data-act="new-rcpt">${esc(t('add_rcpt'))}</button>`)
  + `<div class="stats">
      <div class="stat ${totalReceivable()>0?'caution':''}"><div class="k">${esc(t('receivable'))}</div>
        <div class="v">${fmtK(totalReceivable())} ₭</div><div class="u">$${fmtUSD(toUSD(totalReceivable()))}</div></div>
      <div class="stat"><div class="k">${esc(t('nav_rcpt'))}</div><div class="v">${list.length}</div>
        <div class="u">${fmtK(list.filter(r=>!r.voided).reduce((s,r)=>s+n(r.amount),0))} ₭</div></div>
    </div>
    <div class="panel" style="margin-bottom:18px">
      <header><h2>${esc(t('nav_rcpt'))}</h2></header>
      <div class="tablewrap"><table>
        <thead><tr><th>${esc(t('no'))}</th><th>${esc(t('date'))}</th><th>${esc(t('customer'))}</th>
        <th>${esc(t('method'))}</th><th>${esc(t('against_inv'))}</th><th class="r">${esc(t('amount'))}</th>
        <th class="r">${esc(t('act'))}</th></tr></thead>
        <tbody>${list.length?list.map(r=>`<tr ${r.voided?'style="opacity:.5"':''}>
          <td class="mono">${esc(r.no||'')}</td><td class="mono">${esc(r.date||'')}</td>
          <td>${esc(r.customerName||'—')}</td>
          <td class="sub2">${esc(t(r.method||'cash'))}${r.ref?' · '+esc(r.ref):''}</td>
          <td class="sub2 mono">${esc((r.items||[]).map(i=>i.no).filter(Boolean).join(', ')||'—')}</td>
          <td class="r num"><b>${fmtK(r.amount)}</b> ₭</td>
          <td class="r" style="white-space:nowrap">
            <button class="btn sm ghost" data-act="print-rcpt" data-id="${r.id}">${esc(t('print'))}</button>
            <button class="btn sm ghost" data-act="del-rcpt" data-id="${r.id}">✕</button></td></tr>`).join('')
          :`<tr><td colspan="7" class="empty">${esc(t('none'))}</td></tr>`}</tbody>
      </table></div></div>
    <div class="panel"><header><h2>${esc(t('outstanding'))}</h2><span class="sub">${openInv.length} ${esc(t('invoices_n'))}</span></header>
      <div class="tablewrap"><table>
        <thead><tr><th>${esc(t('no'))}</th><th>${esc(t('date'))}</th><th>${esc(t('customer'))}</th>
        <th class="r">${esc(t('grand'))}</th><th class="r">${esc(t('paid'))}</th><th class="r">${esc(t('outstanding'))}</th><th class="r"></th></tr></thead>
        <tbody>${openInv.length?openInv.map(i=>`<tr>
          <td class="mono">${esc(i.no)}</td><td class="mono">${esc(i.date)}</td><td>${esc(i.customerName||'—')}</td>
          <td class="r num sub2">${fmtK(docTotals(i).grand)}</td>
          <td class="r num sub2">${fmtK(paidFor(i.id))}</td>
          <td class="r num"><b>${fmtK(outstanding(i))}</b></td>
          <td class="r"><button class="btn sm" data-act="pay-inv" data-id="${i.id}">${esc(t('add_rcpt'))}</button></td></tr>`).join('')
          :`<tr><td colspan="7" class="empty">✓ ${lang==='la'?'ບໍ່ມີບິນຄ້າງຊຳລະ':'Nothing outstanding'}</td></tr>`}</tbody>
      </table></div></div>`;
}

/* ============================================================
   CONTACTS
   ============================================================ */
function viewPart(){
  let list=S.partners.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  if(ui.partFilter!=='all') list=list.filter(p=>p.type===ui.partFilter);
  const f=(k,l)=>`<button class="btn sm ${ui.partFilter===k?'primary':'ghost'}" data-filter="part" data-val="${k}">${esc(t(l))}</button>`;
  return head('nav_part','sub_part',
    `${f('all','all')}${f('customer','cust')}${f('supplier','sup')}
     <button class="btn primary" data-act="new-part">${esc(t('add_part'))}</button>`)
  + `<div class="panel"><div class="tablewrap"><table>
    <thead><tr><th>${esc(t('type'))}</th><th>${esc(t('name'))}</th><th>${esc(t('contact'))}</th>
    <th>${esc(t('phone'))}</th><th>${esc(t('address'))}</th><th class="r">${esc(t('outstanding'))}</th><th class="r">${esc(t('act'))}</th></tr></thead>
    <tbody>${list.length?list.map(p=>{
      const due=p.type==='customer'?S.invoices.filter(i=>i.customerId===p.id&&i.status==='issued').reduce((s,i)=>s+outstanding(i),0):0;
      return `<tr>
      <td><span class="tag ${p.type==='customer'?'info':'mute'}">${esc(t(p.type==='customer'?'cust':'sup'))}</span></td>
      <td><b>${esc(p.name)}</b></td><td class="sub2">${esc(p.contact||'—')}</td>
      <td class="mono">${esc(p.phone||'—')}</td><td class="sub2">${esc(p.address||'—')}</td>
      <td class="r num">${due>0?'<b>'+fmtK(due)+'</b> ₭':'<span class="sub2">—</span>'}</td>
      <td class="r" style="white-space:nowrap">
        <button class="btn sm ghost" data-act="edit-part" data-id="${p.id}">${esc(t('edit'))}</button>
        <button class="btn sm ghost" data-act="del-part" data-id="${p.id}">✕</button></td></tr>`;}).join('')
      :`<tr><td colspan="7" class="empty">${esc(t('none'))}</td></tr>`}</tbody></table></div></div>`;
}

/* ============================================================
   MONTHLY REPORT
   ============================================================ */
function reportData(m){
  const inv=S.invoices.filter(i=>i.status==='issued' && String(i.date||'').startsWith(m));
  const rows={}; let revenue=0, cogs=0;
  inv.forEach(d=>{
    revenue+=docTotals(d).grand;
    (d.items||[]).forEach(it=>{
      const key=it.productId||it.code||it.name;
      const line=n(it.qty)*n(it.price)*(1-n(it.discount)/100);
      let c=0;
      (it.alloc||[]).forEach(a=>{ const l=S.lots.find(x=>x.id===a.lotId); c += n(a.qty)*n(a.cost!=null?a.cost:(l?l.cost:0)); });
      if(!(it.alloc||[]).length){ const p=prod(it.productId); c=n(it.qty)*n(p?p.cost:0); }
      cogs+=c;
      if(!rows[key]) rows[key]={name:it.name||pname(prod(it.productId)), code:it.code||'', unit:it.unit||'', qty:0, rev:0, cost:0};
      rows[key].qty+=n(it.qty); rows[key].rev+=line; rows[key].cost+=c;
    });
  });
  const recv=S.lots.filter(l=>String(l.dateIn||'').startsWith(m));
  const rcpts=S.receipts.filter(r=>!r.voided && String(r.date||'').startsWith(m));
  return { inv, rows:Object.values(rows).sort((a,b)=>b.rev-a.rev), revenue, cogs,
           recv, recvVal:recv.reduce((s,l)=>s+n(l.qty)*n(l.cost),0),
           collected:rcpts.reduce((s,r)=>s+n(r.amount),0), rcpts };
}
function viewRep(){
  const m=ui.repMonth, R=reportData(m);
  return head('nav_rep','sub_rep',
    `<input type="month" id="repmonth" value="${esc(m)}" style="width:160px">
     <button class="btn" data-act="export-rep">${esc(t('export'))}</button>
     <button class="btn" data-act="print-rep">${esc(t('print'))}</button>`)
  + `<div class="stats">
      <div class="stat"><div class="k">${esc(t('revenue'))}</div><div class="v">${fmtK(R.revenue)} ₭</div>
        <div class="u">$${fmtUSD(toUSD(R.revenue))} · ${R.inv.length} ${esc(t('invoices_n'))}</div></div>
      <div class="stat"><div class="k">${esc(t('cogs'))}</div><div class="v">${fmtK(R.cogs)} ₭</div>
        <div class="u">$${fmtUSD(toUSD(R.cogs))}</div></div>
      <div class="stat"><div class="k">${esc(t('profit'))}</div><div class="v">${fmtK(R.revenue-R.cogs)} ₭</div>
        <div class="u">${R.revenue?Math.round((R.revenue-R.cogs)/R.revenue*100):0}% margin</div></div>
      <div class="stat"><div class="k">${esc(t('nav_rcpt'))}</div><div class="v">${fmtK(R.collected)} ₭</div>
        <div class="u">${R.rcpts.length} ${esc(t('nav_rcpt'))} · ${esc(t('received'))} ${fmtK(R.recvVal)} ₭</div></div>
    </div>
    <div class="panel" style="margin-bottom:18px">
      <header><h2>${esc(t('by_prod'))}</h2><span class="sub">${esc(m)}</span></header>
      <div class="tablewrap"><table>
        <thead><tr><th>${esc(t('code'))}</th><th>${esc(t('name'))}</th><th class="r">${esc(t('qty_sold'))}</th>
        <th class="r">${esc(t('revenue'))}</th><th class="r">${esc(t('cogs'))}</th><th class="r">${esc(t('profit'))}</th></tr></thead>
        <tbody>${R.rows.length?R.rows.map(r=>`<tr>
          <td class="mono">${esc(r.code)}</td><td>${esc(r.name)}</td>
          <td class="r num">${fmtK(r.qty)} <span class="sub2">${esc(r.unit)}</span></td>
          <td class="r num">${fmtK(r.rev)}</td><td class="r num sub2">${fmtK(r.cost)}</td>
          <td class="r num"><b>${fmtK(r.rev-r.cost)}</b></td></tr>`).join('')
          :`<tr><td colspan="6" class="empty">${esc(t('none'))}</td></tr>`}</tbody></table></div></div>
    <div class="panel"><header><h2>${esc(t('nav_inv'))}</h2><span class="sub">${esc(m)}</span></header>
      ${invoiceTable(R.inv.slice().sort(byDateDesc),'inv')}</div>`;
}

/* ============================================================
   SETTINGS
   ============================================================ */
function viewSet(){
  const s=st();
  return head('nav_set','sub_set','')
  + `<div class="panel" style="max-width:720px;margin-bottom:18px">
      <header><h2>${esc(both('logo'))}</h2><span class="sub">${esc(t('logo_hint'))}</span></header>
      <div style="padding:18px;display:grid;grid-template-columns:180px minmax(0,1fr);gap:16px;align-items:center">
        <div class="logoslot">${hasLogo()?logoImg(64):esc(t('no_logo'))}</div>
        <div style="display:flex;gap:9px;flex-wrap:wrap">
          <label class="btn" style="cursor:pointer;margin:0">${esc(t('pick_logo'))}
            <input type="file" id="logofile" accept="image/png,image/jpeg,image/webp,image/svg+xml" style="display:none"></label>
          ${hasLogo()?`<button class="btn danger" data-act="rm-logo">${esc(t('rm_logo'))}</button>`:''}
        </div>
      </div></div>
    <div class="panel" style="max-width:720px"><div style="padding:18px">
    <div class="grid2">
      <label class="f"><span>${esc(both('company'))} (ລາວ)</span><input type="text" id="s_companyLa" value="${esc(s.companyLa)}"></label>
      <label class="f"><span>${esc(both('company'))} (EN)</span><input type="text" id="s_companyEn" value="${esc(s.companyEn)}"></label>
      <label class="f"><span>${esc(both('address'))}</span><input type="text" id="s_address" value="${esc(s.address)}"></label>
      <label class="f"><span>${esc(both('phone'))}</span><input type="text" id="s_phone" value="${esc(s.phone)}"></label>
      <label class="f"><span>${esc(both('taxid'))}</span><input type="text" id="s_taxId" value="${esc(s.taxId)}"></label>
      <label class="f"><span>${esc(both('bank'))}</span><input type="text" id="s_bank" value="${esc(s.bank)}"></label>
      <label class="f"><span>${esc(t('rate'))}</span><input type="number" id="s_rateUSD" value="${esc(s.rateUSD)}" step="1"></label>
      <label class="f"><span>${esc(t('vatrate'))}</span><input type="number" id="s_vat" value="${esc(s.vat)}" step="0.5"></label>
    </div>
    <div style="margin-top:18px;display:flex;gap:9px;flex-wrap:wrap">
      <button class="btn primary" data-act="save-set">${esc(t('save'))}</button>
      <button class="btn" data-act="export-all">${esc(t('export'))} — ${lang==='la'?'ສະຕັອກທັງໝົດ':'full stock'}</button>
    </div>
    <p class="sub2" style="margin-top:16px">${lang==='la'
      ?'ອັດຕາແລກປ່ຽນໃຊ້ສຳລັບສະແດງມູນຄ່າເປັນ USD ເທົ່ານັ້ນ — ຂໍ້ມູນທັງໝົດເກັບເປັນກີບ.'
      :'The exchange rate is for USD display only — all figures are stored in LAK.'}</p>
  </div></div>`;
}

/* ============================================================
   SYNC & INSTALL  (PWA only)
   ============================================================ */
const SQL_SETUP = `create table if not exists cbf_docs (
  id          text primary key,
  coll        text not null,
  data        jsonb not null default '{}'::jsonb,
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now()
);
create index if not exists cbf_docs_coll_idx on cbf_docs (coll);
create index if not exists cbf_docs_upd_idx  on cbf_docs (updated_at);
alter table cbf_docs enable row level security;
drop policy if exists cbf_docs_all on cbf_docs;
create policy cbf_docs_all on cbf_docs
  for all to anon using (true) with check (true);`;

function viewSync(){
  const link = cfgOk()? setupLink() : '';
  return head('nav_sync','sub_sync', deferredInstall?`<button class="btn primary" data-act="install">${esc(t('install_app'))}</button>`:'')
  + (sync.err?`<div class="banner err">⚠ ${esc(sync.err)}</div>`:'')
  + `<div class="stats">
      <div class="stat ${connected()?'':'caution'}"><div class="k">${esc(t('status'))}</div>
        <div class="v" style="font-size:19px">${connected()?'✓ '+esc(t('sync_on')):esc(t('sync_off'))}</div>
        <div class="u">${cfgOk()?esc(cfg.url.replace(/^https?:\/\//,'')):'—'}</div></div>
      <div class="stat"><div class="k">${esc(t('last_sync'))}</div>
        <div class="v" style="font-size:19px">${sync.at?esc(new Date(sync.at).toLocaleTimeString()):'—'}</div>
        <div class="u">${esc(t('pending'))}: ${pendingCount()}</div></div>
      <div class="stat"><div class="k">${esc(t('items'))}</div>
        <div class="v" style="font-size:19px">${Object.values(Docs).filter(d=>!d.deleted).length}</div>
        <div class="u">${lang==='la'?'ລາຍການໃນເຄື່ອງນີ້':'records on this device'}</div></div>
    </div>

    <div class="panel" style="margin-bottom:18px">
      <header><h2>${esc(t('imp_step1'))==='x'?'':'1 · '}${lang==='la'?'ສ້າງຖານຂໍ້ມູນກາງ (ຟຣີ)':'Create the shared database (free)'}</h2></header>
      <div style="padding:18px">
        <div class="steps">
          <div class="step"><div class="n">1</div><div><b>supabase.com → New project</b>
            <span class="sub2">${lang==='la'?'ສ້າງບັນຊີຟຣີ ແລະ ສ້າງ project ໜຶ່ງອັນ (ເລືອກ region Singapore ຈະໄວກວ່າ)':'Create a free account and one project (Singapore region is closest)'}</span></div></div>
          <div class="step"><div class="n">2</div><div><b>SQL Editor → ${lang==='la'?'ວາງຄຳສັ່ງນີ້ ແລ້ວກົດ Run':'paste this and press Run'}</b>
            <div class="code" id="sqlbox">${esc(SQL_SETUP)}</div>
            <button class="btn sm" data-act="copy-sql" style="margin-top:8px">${esc(t('copy'))}</button></div></div>
          <div class="step"><div class="n">3</div><div><b>Settings → API</b>
            <span class="sub2">${lang==='la'?'ສຳເນົາ Project URL ແລະ anon public key ມາໃສ່ຂ້າງລຸ່ມ':'Copy the Project URL and the anon public key into the fields below'}</span></div></div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-bottom:18px">
      <header><h2>2 · ${lang==='la'?'ເຊື່ອມຕໍ່ເຄື່ອງນີ້':'Connect this device'}</h2></header>
      <div style="padding:18px">
        <div class="grid2">
          <label class="f"><span>Supabase Project URL</span><input type="text" id="c_url" value="${esc(cfg.url)}" placeholder="https://xxxx.supabase.co"></label>
          <label class="f"><span>anon public key</span><input type="password" id="c_key" value="${esc(cfg.key)}" placeholder="eyJhbGciOi..."></label>
          <label class="f"><span>${esc(both('device'))}</span><input type="text" id="c_dev" value="${esc(cfg.device)}" placeholder="${lang==='la'?'ຄອມຫ້ອງການ / ມືຖືສາງ':'office PC / store phone'}"></label>
        </div>
        <div style="margin-top:16px;display:flex;gap:9px;flex-wrap:wrap">
          <button class="btn primary" data-act="save-cfg">${esc(t('save_conn'))}</button>
          <button class="btn" data-act="sync-now" ${cfgOk()?'':'disabled'}>${esc(t('sync_now'))}</button>
        </div>
      </div>
    </div>

    ${cfgOk()?`<div class="panel" style="margin-bottom:18px">
      <header><h2>3 · ${esc(t('share_link'))}</h2></header>
      <div style="padding:18px">
        <p class="sub2" style="margin-top:0">${lang==='la'
          ?'ສົ່ງລິ້ງນີ້ໃຫ້ພະນັກງານ — ເປີດເທື່ອດຽວແລ້ວເຄື່ອງນັ້ນຈະເຊື່ອມກັບຖານຂໍ້ມູນດຽວກັນທັນທີ, ບໍ່ຕ້ອງພິມ key ເອງ.'
          :'Send this link to your staff — opening it once connects that device to the same database, with nothing to type in.'}</p>
        <div class="code" id="linkbox" style="white-space:pre-wrap;word-break:break-all">${esc(link)}</div>
        <div style="margin-top:10px;display:flex;gap:9px;flex-wrap:wrap">
          <button class="btn" data-act="copy-link">${esc(t('copy'))}</button>
          <button class="btn" data-act="show-qr">QR</button>
        </div>
      </div></div>`:''}

    <div class="panel">
      <header><h2>${esc(t('backup'))}</h2></header>
      <div style="padding:18px;display:flex;gap:9px;flex-wrap:wrap">
        <button class="btn" data-act="export-json">${esc(t('exp_json'))}</button>
        <label class="btn" style="cursor:pointer;margin:0">${esc(t('imp_json'))}
          <input type="file" id="jsonfile" accept="application/json,.json" style="display:none"></label>
        <button class="btn" data-act="seed-demo">${esc(t('demo'))}</button>
        <button class="btn danger" data-act="wipe">${esc(t('wipe'))}</button>
      </div>
      <p class="sub2" style="padding:0 18px 18px;margin:0">${lang==='la'
        ?'ບໍ່ມີການ login — ໃຜມີລິ້ງຕັ້ງຄ່າກໍເຂົ້າເຖິງຂໍ້ມູນໄດ້. ຢ່າສົ່ງລິ້ງນີ້ໃຫ້ຄົນນອກທີມ.'
        :'There is no login — anyone with the setup link can read and change the data. Share it only inside your team.'}</p>
    </div>`;
}

/* ============================================================
   MODALS
   ============================================================ */
function openModal(fn,size){ modal={render:fn,size:size||''}; render(); }
function closeModal(){ modal=null; draft=null; render(); }
const gv = id => { const e=document.getElementById(id); return e?e.value:''; };

function modalProduct(id){
  const p=id?prod(id):null;
  openModal(()=>`
    <header><h2>${esc(p?t('edit'):t('add_prod'))}</h2><button class="btn ghost" data-act="close">✕</button></header>
    <div class="body"><div class="grid2">
      <label class="f"><span>${esc(both('code'))}</span><input type="text" id="f_code" value="${esc(p&&p.code||'')}" placeholder="MED-001"></label>
      <label class="f"><span>${esc(both('category'))}</span><input type="text" id="f_category" value="${esc(p&&p.category||'')}" placeholder="ຢາເມັດ / Tablet"></label>
      <label class="f"><span>ຊື່ສີນຄ້າ (ລາວ)</span><input type="text" id="f_nameLa" value="${esc(p&&p.nameLa||'')}"></label>
      <label class="f"><span>Item name (EN)</span><input type="text" id="f_nameEn" value="${esc(p&&p.nameEn||'')}"></label>
      <label class="f"><span>${esc(both('unit'))}</span><input type="text" id="f_unit" value="${esc(p&&p.unit||'')}" placeholder="ກ່ອງ / box"></label>
      <label class="f"><span>${esc(both('reorder'))}</span><input type="number" id="f_reorder" value="${esc(p?p.reorder:0)}"></label>
      <label class="f"><span>${esc(both('cost'))} (₭)</span><input type="number" id="f_cost" value="${esc(p?p.cost:0)}"></label>
      <label class="f"><span>${esc(both('price'))} (₭)</span><input type="number" id="f_price" value="${esc(p?p.price:0)}"></label>
    </div></div>
    <div class="foot"><button class="btn" data-act="close">${esc(t('cancel'))}</button>
      <button class="btn primary" data-act="save-prod" data-id="${id||''}">${esc(t('save'))}</button></div>`,'narrow');
}
function saveProduct(id){
  const data={code:gv('f_code'),category:gv('f_category'),nameLa:gv('f_nameLa'),nameEn:gv('f_nameEn'),
    unit:gv('f_unit'),reorder:n(gv('f_reorder')),cost:n(gv('f_cost')),price:n(gv('f_price'))};
  if(!data.code && !data.nameLa && !data.nameEn){ toast('⚠ '+t('code')); return; }
  putDoc('products', id||uid('p'), data); closeModal(); toast(t('saved'));
}

function modalWh(id){
  const w=id?wh(id):null;
  openModal(()=>`
    <header><h2>${esc(w?t('edit'):t('add_wh'))}</h2><button class="btn ghost" data-act="close">✕</button></header>
    <div class="body"><div class="grid2">
      <label class="f"><span>${esc(both('code'))}</span><input type="text" id="w_code" value="${esc(w&&w.code||'')}" placeholder="WH-01"></label>
      <label class="f"><span>ຊື່ສາງ (ລາວ)</span><input type="text" id="w_nameLa" value="${esc(w&&w.nameLa||'')}" placeholder="${esc(D.main_wh[0])}"></label>
      <label class="f"><span>Warehouse name (EN)</span><input type="text" id="w_nameEn" value="${esc(w&&w.nameEn||'')}" placeholder="${esc(D.main_wh[1])}"></label>
      <label class="f"><span>${esc(both('address'))}</span><input type="text" id="w_address" value="${esc(w&&w.address||'')}"></label>
    </div></div>
    <div class="foot"><button class="btn" data-act="close">${esc(t('cancel'))}</button>
      <button class="btn primary" data-act="save-wh" data-id="${id||''}">${esc(t('save'))}</button></div>`,'narrow');
}
function saveWh(id){
  const data={code:gv('w_code'),nameLa:gv('w_nameLa'),nameEn:gv('w_nameEn'),address:gv('w_address')};
  if(!data.nameLa && !data.nameEn && !data.code){ toast('⚠ '+t('name')); return; }
  putDoc('warehouses', id||uid('w'), data); closeModal(); toast(t('saved'));
}

function modalLot(id){
  const l=id?S.lots.find(x=>x.id===id):null;
  const sups=S.partners.filter(p=>p.type==='supplier');
  openModal(()=>`
    <header><h2>${esc(l?t('edit'):t('add_in'))}</h2><button class="btn ghost" data-act="close">✕</button></header>
    <div class="body"><div class="grid2">
      <label class="f"><span>${esc(both('name'))}</span><select id="f_productId">
        <option value="">${esc(t('select_prod'))}</option>
        ${S.products.map(p=>`<option value="${p.id}" ${l&&l.productId===p.id?'selected':''}>${esc(p.code)} — ${esc(pnameBoth(p))}</option>`).join('')}
      </select></label>
      <label class="f"><span>${esc(both('warehouse'))}</span><select id="f_warehouseId">
        <option value="">${esc(t('select_wh'))}</option>${whOptions(l?l.warehouseId:(S.warehouses[0]||{}).id,null)}
      </select></label>
      <label class="f"><span>${esc(both('date'))}</span><input type="date" id="f_dateIn" value="${esc(l?l.dateIn:today())}"></label>
      <label class="f"><span>${esc(both('lot'))}</span><input type="text" id="f_lotNo" value="${esc(l&&l.lotNo||'')}"></label>
      <label class="f"><span>${esc(both('expiry'))}</span><input type="date" id="f_expiry" value="${esc(l&&l.expiry||'')}"></label>
      <label class="f"><span>${esc(both('qty'))}</span><input type="number" id="f_qty" value="${esc(l?l.qty:0)}" step="any"></label>
      <label class="f"><span>${esc(both('cost'))} (₭ / ${esc(t('unit'))})</span><input type="number" id="f_cost" value="${esc(l?l.cost:0)}" step="any"></label>
      <label class="f"><span>${esc(both('supplier'))}</span><select id="f_supplierId">
        <option value="">${esc(t('select_sup'))}</option>
        ${sups.map(p=>`<option value="${p.id}" ${l&&l.supplierId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
      </select></label>
      <label class="f"><span>${esc(both('note'))}</span><input type="text" id="f_note" value="${esc(l&&l.note||'')}"></label>
    </div>
    ${l?`<p class="sub2" style="margin-top:12px">${lang==='la'?'ຄົງເຫຼືອປັດຈຸບັນ':'Current remaining'}: <b class="num">${fmtK(l.remaining)}</b></p>`:''}
    ${!S.warehouses.length?`<p class="banner" style="margin-top:14px">⚠ ${esc(t('wh_needed'))}</p>`:''}
    </div>
    <div class="foot"><button class="btn" data-act="close">${esc(t('cancel'))}</button>
      <button class="btn primary" data-act="save-lot" data-id="${id||''}">${esc(t('save'))}</button></div>`,'narrow');
}
function saveLot(id){
  const old=id?S.lots.find(x=>x.id===id):null;
  const qty=n(gv('f_qty'));
  const data={productId:gv('f_productId'),warehouseId:gv('f_warehouseId'),dateIn:gv('f_dateIn'),
    lotNo:gv('f_lotNo'),expiry:gv('f_expiry'),qty,cost:n(gv('f_cost')),
    supplierId:gv('f_supplierId'),note:gv('f_note'),
    remaining: old ? Math.max(0, n(old.remaining) + (qty - n(old.qty))) : qty};
  if(!data.productId){ toast('⚠ '+t('select_prod')); return; }
  putDoc('lots', id||uid('l'), data); closeModal(); toast(t('saved'));
}

function modalPartner(id){
  const p=id?partner(id):null;
  openModal(()=>`
    <header><h2>${esc(p?t('edit'):t('add_part'))}</h2><button class="btn ghost" data-act="close">✕</button></header>
    <div class="body"><div class="grid2">
      <label class="f"><span>${esc(both('type'))}</span><select id="f_type">
        <option value="customer" ${p&&p.type==='customer'?'selected':''}>${esc(both('cust'))}</option>
        <option value="supplier" ${p&&p.type==='supplier'?'selected':''}>${esc(both('sup'))}</option>
      </select></label>
      <label class="f"><span>${esc(both('name'))}</span><input type="text" id="f_name" value="${esc(p?p.name:'')}"></label>
      <label class="f"><span>${esc(both('contact'))}</span><input type="text" id="f_contact" value="${esc(p&&p.contact||'')}"></label>
      <label class="f"><span>${esc(both('phone'))}</span><input type="text" id="f_phone" value="${esc(p&&p.phone||'')}"></label>
      <label class="f"><span>${esc(both('address'))}</span><input type="text" id="f_address" value="${esc(p&&p.address||'')}"></label>
      <label class="f"><span>${esc(both('taxid'))}</span><input type="text" id="f_taxId" value="${esc(p&&p.taxId||'')}"></label>
    </div></div>
    <div class="foot"><button class="btn" data-act="close">${esc(t('cancel'))}</button>
      <button class="btn primary" data-act="save-part" data-id="${id||''}">${esc(t('save'))}</button></div>`,'narrow');
}
function savePartner(id){
  const data={type:gv('f_type'),name:gv('f_name'),contact:gv('f_contact'),phone:gv('f_phone'),address:gv('f_address'),taxId:gv('f_taxId')};
  if(!data.name){ toast('⚠ '+t('name')); return; }
  putDoc('partners', id||uid('c'), data); closeModal(); toast(t('saved'));
}

/* ---------- transfer between warehouses ---------- */
function modalTransfer(){
  draft={kind:'tr', fromWh:(S.warehouses[0]||{}).id||'', productId:'', lotId:'', qty:0,
         toWh:(S.warehouses[1]||{}).id||'', date:today(), note:''};
  openModal(renderTransfer,'narrow');
}
function renderTransfer(){
  const d=draft;
  const lots=d.productId?S.lots.filter(l=>l.productId===d.productId && l.warehouseId===d.fromWh && n(l.remaining)>0):[];
  const lot=lots.find(l=>l.id===d.lotId);
  return `<header><h2>${esc(t('new_transfer'))}</h2><button class="btn ghost" data-act="close">✕</button></header>
    <div class="body"><div class="grid2">
      <label class="f"><span>${esc(both('date'))}</span><input type="date" data-tr="date" value="${esc(d.date)}"></label>
      <label class="f"><span>${esc(both('from_wh'))}</span><select data-tr="fromWh">${whOptions(d.fromWh,null)}</select></label>
      <label class="f"><span>${esc(both('name'))}</span><select data-tr="productId">
        <option value="">${esc(t('select_prod'))}</option>
        ${S.products.map(p=>`<option value="${p.id}" ${d.productId===p.id?'selected':''}>${esc(p.code)} — ${esc(pnameBoth(p))}</option>`).join('')}
      </select></label>
      <label class="f"><span>Lot</span><select data-tr="lotId">
        <option value="">${lots.length?'— Lot —':esc(t('none'))}</option>
        ${lots.map(l=>`<option value="${l.id}" ${d.lotId===l.id?'selected':''}>${esc(l.lotNo||t('nolot'))}${l.expiry?' · '+esc(l.expiry):''} · ${fmtK(l.remaining)}</option>`).join('')}
      </select></label>
      <label class="f"><span>${esc(both('qty'))}</span><input type="number" data-tr="qty" value="${esc(d.qty)}" step="any" max="${lot?lot.remaining:''}"></label>
      <label class="f"><span>${esc(both('to_wh'))}</span><select data-tr="toWh">${whOptions(d.toWh,null)}</select></label>
      <label class="f" style="grid-column:1/-1"><span>${esc(both('note'))}</span><input type="text" data-tr="note" value="${esc(d.note)}"></label>
    </div>
    ${lot?`<p class="sub2" style="margin-top:12px">${esc(t('remain'))}: <b class="num">${fmtK(lot.remaining)}</b></p>`:''}
    </div>
    <div class="foot"><button class="btn" data-act="close">${esc(t('cancel'))}</button>
      <button class="btn primary" data-act="save-transfer">${esc(t('transfer'))}</button></div>`;
}
async function saveTransfer(){
  const d=draft, src=S.lots.find(l=>l.id===d.lotId);
  if(!src){ toast('⚠ Lot'); return; }
  if(d.fromWh===d.toWh){ toast('⚠ '+t('to_wh')); return; }
  const q=n(d.qty);
  if(q<=0 || q>n(src.remaining)){ toast('⚠ '+t('nostock')); return; }
  await putDoc('lots', src.id, Object.assign({},src,{remaining:n(src.remaining)-q}));
  const dst=S.lots.find(l=>l.productId===src.productId && l.warehouseId===d.toWh &&
      (l.lotNo||'')===(src.lotNo||'') && (l.expiry||'')===(src.expiry||'') && n(l.cost)===n(src.cost));
  if(dst) await putDoc('lots', dst.id, Object.assign({},dst,{qty:n(dst.qty)+q, remaining:n(dst.remaining)+q}));
  else await putDoc('lots', uid('l'), {productId:src.productId, warehouseId:d.toWh, dateIn:d.date,
      lotNo:src.lotNo||'', expiry:src.expiry||'', qty:q, remaining:q, cost:n(src.cost),
      supplierId:src.supplierId||'', note:(lang==='la'?'ໂອນຈາກ ':'from ')+whName(d.fromWh)});
  await putDoc('transfers', uid('t'), {date:d.date, productId:src.productId, productName:pnameBoth(prod(src.productId)),
      lotNo:src.lotNo||'', fromWh:d.fromWh, toWh:d.toWh, qty:q, note:d.note});
  closeModal(); toast(t('saved'));
}

/* ---------- invoice / quotation editor ---------- */
function emptyItem(){ return {productId:'',code:'',name:'',unit:'',qty:1,price:0,discount:0}; }
function modalDoc(kind,id){
  const coll = kind==='quo'?'quotes':'invoices';
  const src = id ? S[coll].find(x=>x.id===id) : null;
  draft = { kind, id, coll, doc: src ? JSON.parse(JSON.stringify(src)) : {
      no: nextNo(kind==='quo'?'QT':'INV', S[coll]), date: today(), customerId:'', customerName:'',
      warehouseId:(S.warehouses[0]||{}).id||'', items:[emptyItem()], note:'', vat: st().vat, status:'draft',
      validUntil: kind==='quo'? new Date(Date.now()+15*864e5).toISOString().slice(0,10) : undefined }};
  if(!draft.doc.items || !draft.doc.items.length) draft.doc.items=[emptyItem()];
  openModal(renderDocEditor,'wide');
}
function renderDocEditor(){
  const d=draft.doc, isQ=draft.kind==='quo';
  const custs=S.partners.filter(p=>p.type==='customer');
  const tt=docTotals(d);
  return `<header><h2>${esc(isQ?t('nav_quo'):t('nav_inv'))} · <span class="mono">${esc(d.no)}</span></h2>
      <button class="btn ghost" data-act="close">✕</button></header>
    <div class="body">
      <div class="grid2" style="margin-bottom:16px">
        <label class="f"><span>${esc(both('no'))}</span><input type="text" value="${esc(d.no)}" data-dfield="no"></label>
        <label class="f"><span>${esc(both('date'))}</span><input type="date" value="${esc(d.date)}" data-dfield="date"></label>
        <label class="f"><span>${esc(both('customer'))}</span>
          <select data-dfield="customerId">
            <option value="">${esc(t('select_cust'))}</option>
            ${custs.map(c=>`<option value="${c.id}" ${d.customerId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
            <option value="__other" ${d.customerId==='__other'?'selected':''}>${lang==='la'?'ອື່ນໆ (ພິມເອງ)':'Other (type name)'}</option>
          </select></label>
        ${d.customerId==='__other'?`<label class="f"><span>${esc(both('name'))}</span><input type="text" value="${esc(d.customerName||'')}" data-dfield="customerName"></label>`:''}
        <label class="f"><span>${esc(both('warehouse'))}</span><select data-dfield="warehouseId">
          <option value="">${esc(t('all_wh'))}</option>${whOptions(d.warehouseId,null)}</select></label>
        ${isQ?`<label class="f"><span>${esc(both('valid'))}</span><input type="date" value="${esc(d.validUntil||'')}" data-dfield="validUntil"></label>`:''}
        <label class="f"><span>${esc(t('vatrate'))}</span><input type="number" value="${esc(d.vat)}" data-dfield="vat" step="0.5"></label>
      </div>
      <div class="panel"><div class="tablewrap"><table class="items">
        <thead><tr><th style="min-width:210px">${esc(t('name'))}</th><th class="r" style="width:92px">${esc(t('qty'))}</th>
        <th style="width:80px">${esc(t('unit'))}</th><th class="r" style="width:120px">${esc(t('price'))}</th>
        <th class="r" style="width:80px">${esc(t('discount'))}</th><th class="r" style="width:120px">${esc(t('total'))}</th>
        <th class="r" style="width:110px">${esc(t('stock'))}</th><th></th></tr></thead>
        <tbody>${d.items.map((it,i)=>{
          const p=prod(it.productId), have=it.productId?onHand(it.productId, d.warehouseId||null):null;
          const line=n(it.qty)*n(it.price)*(1-n(it.discount)/100);
          const short = have!=null && n(it.qty)>have;
          return `<tr>
            <td><select data-item="${i}" data-field="productId">
              <option value="">${esc(t('select_prod'))}</option>
              ${S.products.map(pp=>`<option value="${pp.id}" ${it.productId===pp.id?'selected':''}>${esc(pp.code)} — ${esc(pnameBoth(pp))}</option>`).join('')}
            </select>${!it.productId?`<input type="text" data-item="${i}" data-field="name" value="${esc(it.name||'')}" placeholder="${lang==='la'?'ຫຼືພິມຊື່ເອງ':'or type a name'}" style="margin-top:4px">`:''}</td>
            <td><input type="number" class="r" data-item="${i}" data-field="qty" value="${esc(it.qty)}" step="any"></td>
            <td><input type="text" data-item="${i}" data-field="unit" value="${esc(it.unit|| (p?p.unit:'') ||'')}"></td>
            <td><input type="number" class="r" data-item="${i}" data-field="price" value="${esc(it.price)}" step="any"></td>
            <td><input type="number" class="r" data-item="${i}" data-field="discount" value="${esc(it.discount||0)}" step="any"></td>
            <td class="r num" data-line="${i}">${fmtK(line)}</td>
            <td class="r num ${short?'':'sub2'}" data-have="${i}">${have==null?'—':`<span class="${short?'tag bad':''}">${fmtK(have)}</span>`}</td>
            <td class="r"><button class="btn sm ghost" data-act="rm-item" data-i="${i}">✕</button></td></tr>`;}).join('')}
        </tbody></table></div>
        <div style="padding:9px 12px"><button class="btn sm" data-act="add-item">${esc(t('add_item'))}</button></div>
        <div class="totbox"><div class="tot">
          <div class="lbl">${esc(both('subtotal'))}</div><div class="v num" id="t_sub">${fmtK(tt.sub)} ₭</div>
          <div class="lbl" id="t_vatlbl">${esc(both('vat'))} ${n(d.vat)}%</div><div class="v num" id="t_vat">${fmtK(tt.vat)} ₭</div>
          <div class="lbl big">${esc(t('grand'))}</div><div class="v big" id="t_grand">${fmtK(tt.grand)} ₭</div>
          <div class="lbl sub2">USD @ ${fmtK(st().rateUSD)}</div><div class="v sub2 num" id="t_usd">$${fmtUSD(toUSD(tt.grand))}</div>
        </div></div>
      </div>
      <label class="f" style="margin-top:14px"><span>${esc(both('note'))}</span><textarea rows="2" data-dfield="note">${esc(d.note||'')}</textarea></label>
    </div>
    <div class="foot">
      <button class="btn" data-act="close">${esc(t('cancel'))}</button>
      <button class="btn" data-act="save-doc" data-issue="0">${esc(t('save'))} (${esc(t('draft'))})</button>
      ${draft.kind==='inv'?`<button class="btn primary" data-act="save-doc" data-issue="1">${esc(t('issue'))}</button>`
        :`<button class="btn primary" data-act="save-doc" data-issue="0" data-mark="sent">${esc(t('save'))} &amp; ${esc(t('sent'))}</button>`}
    </div>`;
}
function refreshDocTotals(){
  if(!draft || !draft.doc) return;
  const d=draft.doc, tt=docTotals(d);
  (d.items||[]).forEach((it,i)=>{
    const cell=document.querySelector('[data-line="'+i+'"]');
    if(cell) cell.textContent=fmtK(n(it.qty)*n(it.price)*(1-n(it.discount)/100));
    const hv=document.querySelector('[data-have="'+i+'"]');
    if(hv && it.productId){
      const have=onHand(it.productId, d.warehouseId||null), short=n(it.qty)>have;
      hv.className='r num '+(short?'':'sub2');
      hv.innerHTML='<span class="'+(short?'tag bad':'')+'">'+fmtK(have)+'</span>';
    }
  });
  const set=(id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
  set('t_sub',fmtK(tt.sub)+' ₭'); set('t_vat',fmtK(tt.vat)+' ₭');
  set('t_grand',fmtK(tt.grand)+' ₭'); set('t_usd','$'+fmtUSD(toUSD(tt.grand)));
  set('t_vatlbl',both('vat')+' '+n(d.vat)+'%');
}
function docFieldChange(field,val){
  if(field==='customerId'){
    draft.doc.customerId=val;
    const c=partner(val); draft.doc.customerName = c ? c.name : (val==='__other'? (draft.doc.customerName||'') : '');
  } else if(field==='vat') draft.doc.vat=n(val);
  else draft.doc[field]=val;
  render();
}
function itemChange(i,field,val){
  const it=draft.doc.items[i];
  if(field==='productId'){
    it.productId=val; const p=prod(val);
    if(p){ it.code=p.code; it.name=pnameBoth(p); it.unit=p.unit||''; if(!n(it.price)) it.price=n(p.price); }
  } else if(['qty','price','discount'].includes(field)) it[field]=n(val);
  else it[field]=val;
  render();
}
function allocate(items, whId){
  const plan=[], shortages=[], used={};
  items.forEach(it=>{
    if(!it.productId) return;
    let need=n(it.qty); const alloc=[];
    lotsFEFO(it.productId, whId||null).forEach(l=>{
      if(need<=0) return;
      const free=n(l.remaining)-(used[l.id]||0);
      if(free<=0) return;
      const take=Math.min(free,need);
      used[l.id]=(used[l.id]||0)+take; need-=take;
      alloc.push({lotId:l.id, lotNo:l.lotNo||'', expiry:l.expiry||'', qty:take, cost:n(l.cost)});
    });
    if(need>0.0001) shortages.push({name:it.name||pname(prod(it.productId)), short:need});
    plan.push({item:it, alloc});
  });
  return {plan, shortages, used};
}
async function saveDoc(issue,mark){
  const d=draft.doc, coll=draft.coll;
  d.items=(d.items||[]).filter(it=>it.productId||it.name);
  if(!d.items.length){ toast('⚠ '+t('items')); return; }
  if(!d.customerName && d.customerId){ const c=partner(d.customerId); if(c) d.customerName=c.name; }
  if(mark) d.status=mark;
  if(issue && draft.kind==='inv'){
    if(MODE==='pwa' && cfgOk()) await syncNow(true);
    const {plan,shortages,used}=allocate(d.items, d.warehouseId);
    if(shortages.length){ toast('⚠ '+t('nostock')+': '+shortages.map(s=>s.name+' ('+fmtK(s.short)+')').join(', ')); return; }
    plan.forEach(p=>{ p.item.alloc=p.alloc; });
    for(const lotId in used){
      const l=S.lots.find(x=>x.id===lotId);
      if(l) await putDoc('lots', lotId, Object.assign({},l,{remaining:Math.max(0,n(l.remaining)-used[lotId])}));
    }
    d.status='issued'; d.issuedAt=nowISO();
  }
  await putDoc(coll, draft.id||uid(draft.kind==='quo'?'q':'i'), d);
  closeModal(); toast(t('saved'));
}
async function issueExisting(id){
  const d=S.invoices.find(x=>x.id===id); if(!d) return;
  draft={kind:'inv', id, coll:'invoices', doc:JSON.parse(JSON.stringify(d))};
  await saveDoc(1);
}
async function voidInvoice(id){
  const d=S.invoices.find(x=>x.id===id); if(!d||d.status!=='issued') return;
  const back={};
  (d.items||[]).forEach(it=>(it.alloc||[]).forEach(a=>{ back[a.lotId]=(back[a.lotId]||0)+n(a.qty); }));
  for(const lotId in back){
    const l=S.lots.find(x=>x.id===lotId);
    if(l) await putDoc('lots', lotId, Object.assign({},l,{remaining:n(l.remaining)+back[lotId]}));
  }
  await putDoc('invoices', id, Object.assign({},d,{status:'void', voidedAt:nowISO()}));
  toast(t('voided'));
}
function convertQuote(id){
  const q=S.quotes.find(x=>x.id===id); if(!q) return;
  const copy=JSON.parse(JSON.stringify(q)); delete copy.id; delete copy.validUntil;
  draft={kind:'inv', id:null, coll:'invoices', doc:Object.assign(copy,{
    no: nextNo('INV', S.invoices), date: today(), status:'draft', fromQuote:q.no,
    warehouseId: q.warehouseId||(S.warehouses[0]||{}).id||'' })};
  openModal(renderDocEditor,'wide');
}
function modalLots(pid){
  const p=prod(pid);
  const lots=S.lots.filter(l=>l.productId===pid).sort((a,b)=>String(a.expiry||'9999').localeCompare(String(b.expiry||'9999')));
  openModal(()=>`
    <header><h2>${esc(t('lots_of'))} ${esc(pnameBoth(p))}</h2><button class="btn ghost" data-act="close">✕</button></header>
    <div class="body"><div class="panel"><div class="tablewrap"><table>
      <thead><tr><th>Lot</th><th>${esc(t('expiry'))}</th><th>${esc(t('warehouse'))}</th><th class="r">${esc(t('received'))}</th>
      <th class="r">${esc(t('remain'))}</th><th class="r">${esc(t('cost'))}</th></tr></thead>
      <tbody>${lots.length?lots.map(l=>{const d=l.expiry?daysTo(l.expiry):null;return `<tr>
        <td class="mono">${esc(l.lotNo||t('nolot'))}</td>
        <td>${l.expiry?esc(l.expiry)+(d<=90?` <span class="tag ${d<0?'bad':'warn'}">${d<0?esc(t('expired')):d+' '+esc(t('days'))}</span>`:''):'—'}</td>
        <td class="sub2">${esc(whName(l.warehouseId))}</td>
        <td class="r num sub2">${fmtK(l.qty)}</td><td class="r num"><b>${fmtK(l.remaining)}</b></td>
        <td class="r num sub2">${fmtK(l.cost)}</td></tr>`}).join('')
        :`<tr><td colspan="6" class="empty">${esc(t('none'))}</td></tr>`}</tbody></table></div></div>
      <p class="sub2" style="margin-top:12px">${lang==='la'?'ຕັດສະຕັອກແບບ FEFO — Lot ທີ່ໝົດອາຍຸກ່ອນຈະຖືກຕັດອອກກ່ອນ ພາຍໃນສາງທີ່ເລືອກ.':'Stock is deducted FEFO within the selected warehouse — the earliest-expiring lot goes first.'}</p>
    </div>
    <div class="foot"><button class="btn" data-act="close">${esc(t('close'))}</button></div>`,'');
}

/* ---------- receipt ---------- */
function modalReceipt(invId){
  const inv=invId?S.invoices.find(x=>x.id===invId):null;
  const custId=inv?inv.customerId:'';
  draft={kind:'rcpt', id:null, doc:{ no:nextNo('RC', S.receipts), date:today(),
    customerId:custId||'', customerName:inv?inv.customerName:'', method:'cash', ref:'', note:'',
    items:[], amount:0 }};
  if(inv) draft.doc.items=[{invoiceId:inv.id, no:inv.no, amount:outstanding(inv)}];
  recalcReceipt();
  openModal(renderReceipt,'');
}
function openInvoicesFor(custId){
  return S.invoices.filter(i=>i.status==='issued' && (!custId||i.customerId===custId) && outstanding(i)>0.5).sort(byDateDesc);
}
function recalcReceipt(){ draft.doc.amount=(draft.doc.items||[]).reduce((s,i)=>s+n(i.amount),0); }
function renderReceipt(){
  const d=draft.doc;
  const custs=S.partners.filter(p=>p.type==='customer');
  const list=openInvoicesFor(d.customerId);
  const picked=id=>(d.items||[]).find(x=>x.invoiceId===id);
  return `<header><h2>${esc(t('nav_rcpt'))} · <span class="mono">${esc(d.no)}</span></h2>
      <button class="btn ghost" data-act="close">✕</button></header>
    <div class="body">
      <div class="grid2" style="margin-bottom:16px">
        <label class="f"><span>${esc(both('no'))}</span><input type="text" value="${esc(d.no)}" data-rfield="no"></label>
        <label class="f"><span>${esc(both('date'))}</span><input type="date" value="${esc(d.date)}" data-rfield="date"></label>
        <label class="f"><span>${esc(both('customer'))}</span><select data-rfield="customerId">
          <option value="">${esc(t('select_cust'))}</option>
          ${custs.map(c=>`<option value="${c.id}" ${d.customerId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
        </select></label>
        <label class="f"><span>${esc(both('method'))}</span><select data-rfield="method">
          <option value="cash" ${d.method==='cash'?'selected':''}>${esc(both('cash'))}</option>
          <option value="bank_tr" ${d.method==='bank_tr'?'selected':''}>${esc(both('bank_tr'))}</option>
          <option value="cheque" ${d.method==='cheque'?'selected':''}>${esc(both('cheque'))}</option>
        </select></label>
        <label class="f"><span>${esc(both('ref_no'))}</span><input type="text" value="${esc(d.ref||'')}" data-rfield="ref"></label>
      </div>
      <div class="panel"><header><h2 style="font-size:14px">${esc(t('against_inv'))}</h2></header>
        <div class="tablewrap"><table class="items">
          <thead><tr><th style="width:34px"></th><th>${esc(t('no'))}</th><th>${esc(t('date'))}</th>
          <th class="r">${esc(t('grand'))}</th><th class="r">${esc(t('outstanding'))}</th><th class="r" style="width:150px">${esc(t('amount'))}</th></tr></thead>
          <tbody>${list.length?list.map(i=>{
            const sel=picked(i.id);
            return `<tr><td class="c"><input type="checkbox" data-pick="${i.id}" ${sel?'checked':''}></td>
              <td class="mono">${esc(i.no)}</td><td class="mono sub2">${esc(i.date)}</td>
              <td class="r num sub2">${fmtK(docTotals(i).grand)}</td>
              <td class="r num">${fmtK(outstanding(i))}</td>
              <td><input type="number" class="r" data-payamt="${i.id}" value="${sel?esc(sel.amount):''}" step="any" ${sel?'':'disabled'}></td></tr>`;}).join('')
            :`<tr><td colspan="6" class="empty">${esc(t('no_outstanding'))}</td></tr>`}</tbody></table></div>
        <div class="totbox"><div class="tot">
          <div class="lbl big">${esc(t('amount'))}</div><div class="v big" id="r_amt">${fmtK(d.amount)} ₭</div>
          <div class="lbl sub2">USD @ ${fmtK(st().rateUSD)}</div><div class="v sub2 num">$${fmtUSD(toUSD(d.amount))}</div>
          <div class="lbl sub2" style="grid-column:1/-1;text-align:right">${esc(laoNumWords(d.amount))} ${esc(D.kip_only[0])}</div>
        </div></div>
      </div>
      <label class="f" style="margin-top:14px"><span>${esc(both('note'))}</span><input type="text" value="${esc(d.note||'')}" data-rfield="note"></label>
    </div>
    <div class="foot"><button class="btn" data-act="close">${esc(t('cancel'))}</button>
      <button class="btn primary" data-act="save-rcpt">${esc(t('save'))} &amp; ${esc(t('print'))}</button></div>`;
}
async function saveReceipt(){
  const d=draft.doc;
  d.items=(d.items||[]).filter(i=>n(i.amount)>0);
  recalcReceipt();
  if(!d.items.length && n(d.amount)<=0){ toast('⚠ '+t('amount')); return; }
  if(!d.customerName && d.customerId){ const c=partner(d.customerId); if(c) d.customerName=c.name; }
  const id=uid('r');
  await putDoc('receipts', id, d);
  closeModal(); toast(t('saved'));
  setTimeout(()=>printReceipt(id), 350);
}

/* ============================================================
   EXCEL / CSV IMPORT
   ============================================================ */
const IMP_FIELDS=[
  ['code',       ['ລະຫັດ','ລະຫັດສີນຄ້າ','code','item code','sku','product code','รหัส']],
  ['nameLa',     ['ຊື່','ຊື່ສີນຄ້າ','ຊື່ລາວ','name la','lao name','ຊື່ສິນຄ້າ']],
  ['nameEn',     ['name','item name','product name','english name','description','ຊື່ອັງກິດ']],
  ['unit',       ['ຫົວໜ່ວຍ','ໜ່ວຍ','unit','uom','ຫົວຫນ່ວຍ']],
  ['category',   ['ໝວດ','ປະເພດ','category','group','type','ຫມວດ']],
  ['cost',       ['ຕົ້ນທຶນ','ລາຄາຕົ້ນທຶນ','cost','unit cost','buy price','purchase price']],
  ['price',      ['ລາຄາ','ລາຄາຂາຍ','price','sell price','selling price','unit price']],
  ['reorder',    ['ຈຸດສັ່ງຊື້','ຈຸດສັ່ງ','reorder','reorder point','min','minimum','min qty']],
  ['openingQty', ['ຈຳນວນ','ຄົງເຫຼືອ','ສະຕັອກ','qty','quantity','stock','on hand','opening','balance']],
  ['lotNo',      ['lot','lot no','ເລກ lot','batch','batch no','ລັອດ']],
  ['expiry',     ['ວັນໝົດອາຍຸ','ໝົດອາຍຸ','expiry','expiry date','exp','expire','ວັນຫມົດອາຍຸ']],
  ['warehouse',  ['ສາງ','warehouse','store','location','ສາງເກັບ']]
];
let imp=null; // {step, rows, headers, map, sheetNames, sheet, wb, fileName}

function loadXLSX(){
  return new Promise((res,rej)=>{
    if(window.XLSX) return res(window.XLSX);
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=()=>window.XLSX?res(window.XLSX):rej(new Error('XLSX'));
    s.onerror=()=>rej(new Error('offline'));
    document.head.appendChild(s);
  });
}
function guessMap(headers){
  const map={};
  headers.forEach((h,i)=>{
    const key=String(h||'').trim().toLowerCase();
    if(!key) return;
    for(const [field,aliases] of IMP_FIELDS){
      if(map[field]!=null) continue;
      if(aliases.some(a=>key===a || key.indexOf(a)===0)){ map[field]=i; break; }
    }
  });
  return map;
}
function modalImport(){
  imp={step:1, rows:[], headers:[], map:{}, sheetNames:[], sheet:'', wb:null, fileName:''};
  openModal(renderImport,'wide');
}
function renderImport(){
  const i=imp;
  let body='';
  if(i.step===1){
    body=`<div class="steps"><div class="step"><div class="n">1</div><div>
        <b>${esc(t('imp_step1'))}</b>
        <span class="sub2">${esc(t('imp_hint'))}</span>
        <div style="margin-top:12px"><input type="file" id="impfile" accept=".xlsx,.xls,.csv,text/csv"></div>
        <button class="btn sm" data-act="imp-template" style="margin-top:12px">${esc(t('template'))}</button>
      </div></div></div>`;
  } else if(i.step===2){
    const opts=(f)=>`<option value="">${esc(t('ignore'))}</option>`+
      i.headers.map((h,ix)=>`<option value="${ix}" ${i.map[f]===ix?'selected':''}>${esc(String(h||'').slice(0,40)||('#'+(ix+1)))}</option>`).join('');
    body=`${i.sheetNames.length>1?`<label class="f" style="max-width:280px;margin-bottom:16px"><span>${esc(both('sheet'))}</span>
        <select data-imp="sheet">${i.sheetNames.map(s=>`<option ${s===i.sheet?'selected':''}>${esc(s)}</option>`).join('')}</select></label>`:''}
      <p class="sub2" style="margin-top:0">${esc(i.fileName)} · ${i.rows.length} ${esc(t('rows_found'))}</p>
      <div class="grid3">${IMP_FIELDS.map(([f])=>`
        <label class="f"><span>${esc(both(f==='warehouse'?'warehouse':f==='openingQty'?'opening':f==='lotNo'?'lot':f))}</span>
          <select data-map="${f}">${opts(f)}</select></label>`).join('')}</div>`;
  } else {
    const parsed=impParse();
    body=`<div class="stats" style="margin-bottom:14px">
        <div class="stat"><div class="k">${esc(t('new_items'))}</div><div class="v">${parsed.newN}</div></div>
        <div class="stat"><div class="k">${esc(t('upd_items'))}</div><div class="v">${parsed.updN}</div></div>
        <div class="stat"><div class="k">${esc(t('opening'))}</div><div class="v">${parsed.lotN}</div>
          <div class="u">${esc(t('lot'))} / ${esc(t('warehouse'))}</div></div>
      </div>
      <div class="panel"><div class="tablewrap"><table>
        <thead><tr><th>${esc(t('code'))}</th><th>${esc(t('name'))}</th><th>${esc(t('unit'))}</th>
          <th class="r">${esc(t('cost'))}</th><th class="r">${esc(t('price'))}</th><th class="r">${esc(t('opening'))}</th>
          <th>Lot</th><th>${esc(t('expiry'))}</th><th>${esc(t('warehouse'))}</th><th>${esc(t('status'))}</th></tr></thead>
        <tbody>${parsed.rows.slice(0,12).map(r=>`<tr>
          <td class="mono">${esc(r.code)}</td><td>${esc(r.nameLa||r.nameEn)}</td><td class="sub2">${esc(r.unit)}</td>
          <td class="r num sub2">${fmtK(r.cost)}</td><td class="r num">${fmtK(r.price)}</td>
          <td class="r num">${r.openingQty?fmtK(r.openingQty):'<span class="sub2">—</span>'}</td>
          <td class="mono sub2">${esc(r.lotNo||'')}</td><td class="sub2">${esc(r.expiry||'')}</td>
          <td class="sub2">${esc(r.whName||'')}</td>
          <td><span class="tag ${r.exists?'info':'ok'}">${esc(t(r.exists?'upd_items':'new_items'))}</span></td></tr>`).join('')}
        </tbody></table></div>
        ${parsed.rows.length>12?`<p class="sub2" style="padding:10px 14px;margin:0">… +${parsed.rows.length-12} ${esc(t('rows_found'))}</p>`:''}
      </div>`;
  }
  return `<header><h2>${esc(t('import_excel'))} · ${i.step}/3</h2><button class="btn ghost" data-act="close">✕</button></header>
    <div class="body">${body}</div>
    <div class="foot">
      <button class="btn" data-act="close">${esc(t('cancel'))}</button>
      ${i.step>1?`<button class="btn" data-act="imp-back">${esc(t('back'))}</button>`:''}
      ${i.step===2?`<button class="btn primary" data-act="imp-next">${esc(t('next'))}</button>`:''}
      ${i.step===3?`<button class="btn primary" data-act="imp-run">${esc(t('do_import'))}</button>`:''}
    </div>`;
}
function cellStr(v){
  if(v==null) return '';
  if(v instanceof Date) return v.toISOString().slice(0,10);
  return String(v).trim();
}
function normDate(v){
  const s=cellStr(v); if(!s) return '';
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  let m=/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s);
  if(m){ let y=+m[3]; if(y<100) y+=2000; if(y>2500) y-=543;
    return y+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[1]).padStart(2,'0'); }
  const d=new Date(s); return isNaN(d)?'':d.toISOString().slice(0,10);
}
function impParse(){
  const m=imp.map, out=[]; let newN=0, updN=0, lotN=0;
  const get=(row,f)=> m[f]!=null ? row[m[f]] : '';
  imp.rows.forEach(row=>{
    const code=cellStr(get(row,'code'));
    const nameLa=cellStr(get(row,'nameLa')), nameEn=cellStr(get(row,'nameEn'));
    if(!code && !nameLa && !nameEn) return;
    const existing=S.products.find(p=>(code && String(p.code).toLowerCase()===code.toLowerCase())
      || (!code && nameLa && p.nameLa===nameLa) || (!code && nameEn && p.nameEn===nameEn));
    const whRaw=cellStr(get(row,'warehouse'));
    const r={ code, nameLa, nameEn, unit:cellStr(get(row,'unit')), category:cellStr(get(row,'category')),
      cost:n(get(row,'cost')), price:n(get(row,'price')), reorder:n(get(row,'reorder')),
      openingQty:n(get(row,'openingQty')), lotNo:cellStr(get(row,'lotNo')), expiry:normDate(get(row,'expiry')),
      whName:whRaw, exists:!!existing, existingId:existing?existing.id:null };
    if(existing) updN++; else newN++;
    if(r.openingQty>0) lotN++;
    out.push(r);
  });
  return {rows:out, newN, updN, lotN};
}
async function runImport(){
  const parsed=impParse();
  let created=0, updated=0, lots=0;
  for(const r of parsed.rows){
    const pid = r.existingId || uid('p');
    const prev = r.existingId?prod(r.existingId):null;
    await putDoc('products', pid, {
      code: r.code || (prev&&prev.code) || pid.slice(-6).toUpperCase(),
      nameLa: r.nameLa || (prev&&prev.nameLa) || '', nameEn: r.nameEn || (prev&&prev.nameEn) || '',
      unit: r.unit || (prev&&prev.unit) || '', category: r.category || (prev&&prev.category) || '',
      cost: r.cost || (prev&&prev.cost) || 0, price: r.price || (prev&&prev.price) || 0,
      reorder: r.reorder || (prev&&prev.reorder) || 0 });
    r.existingId?updated++:created++;
    if(r.openingQty>0){
      let whId=(S.warehouses[0]||{}).id||'';
      if(r.whName){
        const found=S.warehouses.find(w=>[w.code,w.nameLa,w.nameEn].some(x=>x&&String(x).toLowerCase()===r.whName.toLowerCase()));
        if(found) whId=found.id;
        else { whId=uid('w'); await putDoc('warehouses', whId, {code:'', nameLa:r.whName, nameEn:r.whName, address:''}); }
      }
      if(!whId){ whId=uid('w'); await putDoc('warehouses', whId, {code:'WH-01', nameLa:D.main_wh[0], nameEn:D.main_wh[1], address:''}); }
      await putDoc('lots', uid('l'), {productId:pid, warehouseId:whId, dateIn:today(), lotNo:r.lotNo||'',
        expiry:r.expiry||'', qty:r.openingQty, remaining:r.openingQty, cost:r.cost||0, supplierId:'',
        note:(lang==='la'?'ນຳເຂົ້າຈາກ Excel':'imported from Excel')});
      lots++;
    }
  }
  closeModal();
  toast('✓ '+t('imp_done')+' — '+t('new_items')+' '+created+', '+t('upd_items')+' '+updated+(lots?', Lot '+lots:''));
}
function importTemplate(){
  const head=['ລະຫັດ / code','ຊື່ສີນຄ້າ (ລາວ)','Item name (EN)','ຫົວໜ່ວຍ / unit','ໝວດ / category',
    'ຕົ້ນທຶນ / cost','ລາຄາຂາຍ / price','ຈຸດສັ່ງຊື້ / reorder','ຈຳນວນ / qty','Lot','ວັນໝົດອາຍຸ / expiry','ສາງ / warehouse'];
  const rows=[head.join(','),
    'EL-001,ສາຍຊາດ USB-C 1 ແມັດ,USB-C charging cable 1 m,ອັນ / pcs,ສາຍ & ອາແດັບເຕີ,25000,45000,30,120,LOT-2609,,WH-01',
    'EL-003,ຫູຟັງໄຮ້ສາຍ TWS,Wireless earbuds TWS,ອັນ / pcs,ເຄື່ອງສຽງ,180000,290000,15,12,LOT-2608,,WH-01'];
  download('pbsm-import-template.csv','﻿'+rows.join('\n'));
}

/* ============================================================
   PRINT
   ============================================================ */
function docHeadHTML(titleLa,titleEn,meta){
  const s=st();
  return `<div class="head">
    <div style="display:flex;gap:12px;align-items:flex-start">
      ${hasLogo()?logoImg(54,'flex:none'):''}
      <div><div style="font-weight:700;font-size:14px">${esc(s.companyLa)}</div>
        <div style="font-size:12px">${esc(s.companyEn)}</div>
        <div class="meta">${esc(s.address||'')}${s.phone?' · ☎ '+esc(s.phone):''}${s.taxId?' · TAX '+esc(s.taxId):''}</div></div></div>
    <div style="text-align:right"><h1>${esc(titleLa)}</h1>
      <div style="font-size:12px;letter-spacing:.06em">${esc(titleEn)}</div>
      <div class="meta" style="margin-top:6px">${meta}</div></div></div>`;
}
function printDoc(kind,id){
  const d=(kind==='quo'?S.quotes:S.invoices).find(x=>x.id===id); if(!d) return;
  const s=st(), tt=docTotals(d), cust=partner(d.customerId);
  const rows=(d.items||[]).map((it,i)=>{
    const line=n(it.qty)*n(it.price)*(1-n(it.discount)/100);
    const lotTxt=(it.alloc||[]).map(a=>(a.lotNo||'—')+(a.expiry?' ('+a.expiry+')':'')).join(', ');
    return `<tr><td class="c">${i+1}</td>
      <td>${esc(it.name||pnameBoth(prod(it.productId)))}${lotTxt?`<br><span style="font-size:10px">Lot: ${esc(lotTxt)}</span>`:''}</td>
      <td class="c">${esc(it.unit||'')}</td>
      <td style="text-align:right">${fmtK(it.qty)}</td>
      <td style="text-align:right">${fmtK(it.price)}</td>
      <td style="text-align:right">${n(it.discount)?n(it.discount)+'%':'—'}</td>
      <td style="text-align:right">${fmtK(line)}</td></tr>`;}).join('');
  const paid=kind==='inv'?paidFor(d.id):0;
  document.getElementById('printArea').innerHTML=`<div class="doc">
    ${docHeadHTML(kind==='quo'?D.quo_title[0]:D.inv_title[0], kind==='quo'?D.quo_title[1]:D.inv_title[1],
      `ເລກທີ / No.: <b>${esc(d.no)}</b><br>ວັນທີ / Date: ${esc(d.date)}
       ${d.validUntil?`<br>ໃຊ້ໄດ້ຮອດ / Valid: ${esc(d.validUntil)}`:''}
       ${d.warehouseId?`<br>ສາງ / Store: ${esc(whName(d.warehouseId))}`:''}
       ${d.status==='void'?'<br><b>** ຍົກເລີກ / VOID **</b>':''}`)}
    <div style="margin-top:12px;font-size:11.5px">
      <b>ຜູ້ຊື້ / Buyer:</b> ${esc(d.customerName||(cust&&cust.name)||'—')}<br>
      ${esc((cust&&cust.address)||'')} ${cust&&cust.phone?'· ☎ '+esc(cust.phone):''}
      ${cust&&cust.taxId?'<br>TAX: '+esc(cust.taxId):''}</div>
    <table><thead><tr>
      <th class="c" style="width:26px">#</th><th>ລາຍການ / Description</th>
      <th class="c" style="width:52px">ຫົວໜ່ວຍ<br>Unit</th>
      <th style="width:62px;text-align:right">ຈຳນວນ<br>Qty</th>
      <th style="width:78px;text-align:right">ລາຄາ ₭<br>Price</th>
      <th style="width:48px;text-align:right">ສ່ວນຫຼຸດ<br>Disc</th>
      <th style="width:92px;text-align:right">ລວມ ₭<br>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="6" style="text-align:right">ລວມຍ່ອຍ / Subtotal</td><td style="text-align:right">${fmtK(tt.sub)}</td></tr>
        <tr><td colspan="6" style="text-align:right">ອາກອນ VAT ${n(d.vat!=null?d.vat:s.vat)}%</td><td style="text-align:right">${fmtK(tt.vat)}</td></tr>
        <tr><td colspan="6" style="text-align:right"><b>ລວມທັງໝົດ / Grand total (₭)</b></td><td style="text-align:right"><b>${fmtK(tt.grand)}</b></td></tr>
        ${kind==='inv'&&paid>0?`<tr><td colspan="6" style="text-align:right">ຊຳລະແລ້ວ / Paid</td><td style="text-align:right">${fmtK(paid)}</td></tr>
        <tr><td colspan="6" style="text-align:right"><b>ຄ້າງຊຳລະ / Outstanding (₭)</b></td><td style="text-align:right"><b>${fmtK(tt.grand-paid)}</b></td></tr>`:''}
        <tr><td colspan="6" style="text-align:right">USD @ ${fmtK(s.rateUSD)} ₭/$</td><td style="text-align:right">$${fmtUSD(toUSD(tt.grand))}</td></tr>
      </tfoot></table>
    <div class="words"><b>ຈຳນວນເງິນເປັນຕົວໜັງສື:</b> ${esc(laoNumWords(tt.grand))}${esc(D.kip_only[0])}</div>
    ${d.note?`<p style="font-size:11px;margin-top:10px"><b>ໝາຍເຫດ / Note:</b> ${esc(d.note)}</p>`:''}
    ${s.bank?`<p style="font-size:11px;margin-top:6px"><b>ບັນຊີທະນາຄານ / Bank:</b> ${esc(s.bank)}</p>`:''}
    <div class="sign"><div>ຜູ້ອອກບິນ / Issued by</div><div>ຜູ້ອະນຸມັດ / Approved by</div><div>ຜູ້ຮັບສີນຄ້າ / Received by</div></div>
  </div>`;
  window.print();
}
function printReceipt(id){
  const r=S.receipts.find(x=>x.id===id); if(!r) return;
  const s=st(), cust=partner(r.customerId);
  const rows=(r.items||[]).map((it,i)=>{
    const inv=S.invoices.find(x=>x.id===it.invoiceId);
    return `<tr><td class="c">${i+1}</td><td>${esc(it.no||(inv&&inv.no)||'—')}</td>
      <td class="c">${esc(inv?inv.date:'')}</td>
      <td style="text-align:right">${inv?fmtK(docTotals(inv).grand):'—'}</td>
      <td style="text-align:right">${fmtK(it.amount)}</td></tr>`;}).join('');
  const methodTxt = r.method==='bank_tr'?D.bank_tr : r.method==='cheque'?D.cheque : D.cash;
  document.getElementById('printArea').innerHTML=`<div class="doc">
    ${docHeadHTML(D.rcpt_title[0], D.rcpt_title[1],
      `ເລກທີ / No.: <b>${esc(r.no)}</b><br>ວັນທີ / Date: ${esc(r.date)}`)}
    <div style="margin-top:12px;font-size:11.5px">
      <b>ໄດ້ຮັບເງິນຈາກ / Received from:</b> ${esc(r.customerName||(cust&&cust.name)||'—')}<br>
      ${esc((cust&&cust.address)||'')} ${cust&&cust.phone?'· ☎ '+esc(cust.phone):''}<br>
      <b>ຮູບແບບຊຳລະ / Payment:</b> ${esc(methodTxt[0])} / ${esc(methodTxt[1])}${r.ref?' · '+esc(r.ref):''}</div>
    ${rows?`<table><thead><tr><th class="c" style="width:26px">#</th><th>ໃບບິນ / Invoice</th>
      <th class="c" style="width:70px">ວັນທີ<br>Date</th>
      <th style="width:100px;text-align:right">ຍອດບິນ ₭<br>Invoice total</th>
      <th style="width:100px;text-align:right">ຮັບຊຳລະ ₭<br>Paid now</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right"><b>ລວມຮັບເງິນ / Total received (₭)</b></td>
        <td style="text-align:right"><b>${fmtK(r.amount)}</b></td></tr></tfoot></table>`
     :`<table><tbody><tr><td><b>ລວມຮັບເງິນ / Total received (₭)</b></td>
        <td style="text-align:right"><b>${fmtK(r.amount)}</b></td></tr></tbody></table>`}
    <div class="words"><b>ຈຳນວນເງິນເປັນຕົວໜັງສື / Amount in words:</b> ${esc(laoNumWords(r.amount))}${esc(D.kip_only[0])}
      <span style="float:right">(USD ≈ $${fmtUSD(toUSD(r.amount))} @ ${fmtK(s.rateUSD)})</span></div>
    ${r.note?`<p style="font-size:11px;margin-top:10px"><b>ໝາຍເຫດ / Note:</b> ${esc(r.note)}</p>`:''}
    <div class="sign"><div>ຜູ້ຈ່າຍເງິນ / Paid by</div><div>ຜູ້ຮັບເງິນ / Received by</div><div>ຜູ້ອະນຸມັດ / Approved by</div></div>
  </div>`;
  window.print();
}
function printReport(){
  const m=ui.repMonth, R=reportData(m);
  document.getElementById('printArea').innerHTML=`<div class="doc">
    ${docHeadHTML('ສະຫຼຸບປະຈຳເດືອນ','MONTHLY STOCK & SALES REPORT', `ເດືອນ / Month: <b>${esc(m)}</b>`)}
    <table style="margin-top:14px"><tbody>
      <tr><td>ຍອດຂາຍ / Revenue (₭)</td><td style="text-align:right">${fmtK(R.revenue)}</td>
          <td>ຈຳນວນບິນ / Invoices</td><td style="text-align:right">${R.inv.length}</td></tr>
      <tr><td>ຕົ້ນທຶນຂາຍ / Cost of sales (₭)</td><td style="text-align:right">${fmtK(R.cogs)}</td>
          <td>ຮັບເຂົ້າ / Received (₭)</td><td style="text-align:right">${fmtK(R.recvVal)}</td></tr>
      <tr><td><b>ກຳໄລຂັ້ນຕົ້ນ / Gross profit (₭)</b></td><td style="text-align:right"><b>${fmtK(R.revenue-R.cogs)}</b></td>
          <td>ຮັບເງິນ / Collected (₭)</td><td style="text-align:right">${fmtK(R.collected)}</td></tr>
      <tr><td>ມູນຄ່າສະຕັອກ / Stock value (₭)</td><td style="text-align:right">${fmtK(stockValue())}</td>
          <td>ລູກໜີ້ / Receivable (₭)</td><td style="text-align:right">${fmtK(totalReceivable())}</td></tr>
    </tbody></table>
    <table><thead><tr><th>ລະຫັດ<br>Code</th><th>ລາຍການ / Item</th>
      <th style="text-align:right">ຈຳນວນຂາຍ<br>Qty sold</th><th style="text-align:right">ຍອດຂາຍ ₭<br>Revenue</th>
      <th style="text-align:right">ຕົ້ນທຶນ ₭<br>Cost</th><th style="text-align:right">ກຳໄລ ₭<br>Profit</th></tr></thead>
      <tbody>${R.rows.map(r=>`<tr><td>${esc(r.code)}</td><td>${esc(r.name)}</td>
        <td style="text-align:right">${fmtK(r.qty)} ${esc(r.unit)}</td><td style="text-align:right">${fmtK(r.rev)}</td>
        <td style="text-align:right">${fmtK(r.cost)}</td><td style="text-align:right">${fmtK(r.rev-r.cost)}</td></tr>`).join('')
        ||`<tr><td colspan="6" style="text-align:center">—</td></tr>`}</tbody></table>
    ${S.warehouses.length?`<table><thead><tr><th>ສາງ / Warehouse</th>
      <th style="text-align:right">ຈຳນວນລາຍການ / Items</th><th style="text-align:right">ມູນຄ່າ ₭ / Value</th></tr></thead>
      <tbody>${S.warehouses.map(w=>{const ls=S.lots.filter(l=>l.warehouseId===w.id&&n(l.remaining)>0);
        return `<tr><td>${esc(whName(w.id))}</td><td style="text-align:right">${new Set(ls.map(l=>l.productId)).size}</td>
          <td style="text-align:right">${fmtK(stockValue(w.id))}</td></tr>`;}).join('')}</tbody></table>`:''}
    <div class="sign"><div>ຜູ້ສ້າງລາຍງານ / Prepared by</div><div>ຜູ້ກວດສອບ / Checked by</div><div>ຜູ້ອະນຸມັດ / Approved by</div></div>
  </div>`;
  window.print();
}

/* ============================================================
   DOWNLOADS / CSV
   ============================================================ */
function csvEsc(v){ const s=String(v==null?'':v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
async function download(filename, text, mime){
  if(MODE==='artifact'){
    try{
      const dl=await claude.use('downloads');
      if(dl){ await dl.save({filename, data:text}); toast(t('saved')); return; }
    }catch(e){}
    toast('⚠ download unavailable'); return;
  }
  try{
    const blob=new Blob([text],{type:mime||'text/csv;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=filename;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500);
    toast(t('saved'));
  }catch(e){ toast('⚠ '+e.message); }
}
function exportReport(){
  const m=ui.repMonth, R=reportData(m);
  const lines=[['code','item','unit','qty_sold','revenue_LAK','cost_LAK','profit_LAK'].join(',')]
    .concat(R.rows.map(r=>[r.code,r.name,r.unit,r.qty,Math.round(r.rev),Math.round(r.cost),Math.round(r.rev-r.cost)].map(csvEsc).join(',')));
  lines.push(['','TOTAL','',R.rows.reduce((s,r)=>s+r.qty,0),Math.round(R.revenue),Math.round(R.cogs),Math.round(R.revenue-R.cogs)].map(csvEsc).join(','));
  download('pbsm-report-'+m+'.csv','﻿'+lines.join('\n'));
}
function exportStock(){
  const head=['code','name_la','name_en','unit','category','warehouse','lot','expiry','remaining','cost_LAK','value_LAK'];
  const lines=[head.join(',')];
  S.products.slice().sort((a,b)=>String(a.code).localeCompare(String(b.code))).forEach(p=>{
    const ls=S.lots.filter(l=>l.productId===p.id && n(l.remaining)>0);
    if(!ls.length){ lines.push([p.code,p.nameLa,p.nameEn,p.unit,p.category,'','','',0,p.cost,0].map(csvEsc).join(',')); return; }
    ls.forEach(l=>lines.push([p.code,p.nameLa,p.nameEn,p.unit,p.category,whName(l.warehouseId),l.lotNo||'',l.expiry||'',
      l.remaining,l.cost,Math.round(n(l.remaining)*n(l.cost))].map(csvEsc).join(',')));
  });
  download('pbsm-stock-'+today()+'.csv','﻿'+lines.join('\n'));
}
function exportJSON(){
  download('pbsm-backup-'+today()+'.json', JSON.stringify({v:1, at:nowISO(), docs:Docs}, null, 1), 'application/json');
}
async function importJSON(file){
  try{
    const txt=await file.text(); const j=JSON.parse(txt);
    if(!j.docs) throw new Error('format');
    Object.values(j.docs).forEach(d=>{ Docs[d.id]=Object.assign({},d,{dirty:true}); });
    persist(); rebuild(); render(); queueSync(); toast('✓ '+t('saved'));
  }catch(e){ toast('⚠ '+t('imp_err')); }
}

/* ============================================================
   SAMPLE DATA
   ============================================================ */
async function seedDemo(){
  const w1=uid('w'), w2=uid('w');
  await putDoc('warehouses', w1, {code:'WH-01', nameLa:'ສາງໜ້າຮ້ານ', nameEn:'Shop floor', address:''});
  await putDoc('warehouses', w2, {code:'WH-02', nameLa:'ສາງເກັບ', nameEn:'Back store', address:''});
  const P=[
    ['EL-001','ສາຍຊາດ USB-C 1 ແມັດ','USB-C charging cable 1 m','ອັນ / pcs','ສາຍ & ອາແດັບເຕີ / Cables',25000,45000,30],
    ['EL-002','ອາແດັບເຕີຊາດໄວ 33W','33 W fast charger','ອັນ / pcs','ສາຍ & ອາແດັບເຕີ / Cables',95000,150000,20],
    ['EL-003','ຫູຟັງໄຮ້ສາຍ TWS','Wireless earbuds TWS','ອັນ / pcs','ເຄື່ອງສຽງ / Audio',180000,290000,15],
    ['EL-004','ຟິມກັນຮອຍ ກະຈົກນິລະໄພ','Tempered glass screen protector','ອັນ / pcs','ອຸປະກອນເສີມ / Accessories',12000,30000,50],
    ['EL-005','ພາວເວີແບັງ 10,000 mAh','Power bank 10,000 mAh','ອັນ / pcs','ພະລັງງານ / Power',210000,330000,10]
  ];
  const ids=[];
  for(const p of P){ const id=uid('p'); ids.push(id);
    await putDoc('products', id, {code:p[0],nameLa:p[1],nameEn:p[2],unit:p[3],category:p[4],cost:p[5],price:p[6],reorder:p[7]}); }
  const c1=uid('c'), s1=uid('c');
  await putDoc('partners', c1, {type:'customer', name:'ລູກຄ້າທົ່ວໄປ / Walk-in customer', phone:'', address:'', contact:''});
  await putDoc('partners', s1, {type:'supplier', name:'ຮ້ານຂາຍສົ່ງ ຕະຫຼາດເຊົ້າ / Talat Sao wholesale', phone:'020-5555-1234', address:'ນະຄອນຫຼວງວຽງຈັນ', contact:''});
  const L=[[0,w1,'LOT-2609',120,25000],[0,w2,'LOT-2609',200,25000],
           [1,w1,'LOT-2609',40,95000],[2,w1,'LOT-2608',12,180000],
           [3,w1,'LOT-2609',300,12000],[4,w2,'LOT-2608',8,210000]];
  for(const l of L) await putDoc('lots', uid('l'), {productId:ids[l[0]], warehouseId:l[1], dateIn:today(),
    lotNo:l[2], expiry:'', qty:l[3], remaining:l[3], cost:l[4], supplierId:s1, note:''});
  toast('✓ '+t('saved'));
}

/* ============================================================
   RENDER + EVENTS
   ============================================================ */
const VIEWS={dash:viewDash,prod:viewProd,in:viewIn,wh:viewWh,inv:viewInv,quo:viewQuo,
             rcpt:viewRcpt,part:viewPart,rep:viewRep,set:viewSet,sync:viewSync};
function banner(){
  if(MODE==='artifact') return artifactReady?'':`<div class="banner">⚠ ${esc(lang==='la'?'ບໍ່ໄດ້ເຊື່ອມຖານຂໍ້ມູນ — ຂໍ້ມູນຈະບໍ່ຖືກບັນທຶກ':'Not connected to the database — changes will not be saved')}</div>`;
  if(!cfgOk()) return `<div class="banner">⚠ ${esc(t('local_only'))}
      <button class="btn sm" data-route="sync">${esc(t('nav_sync'))} →</button></div>`;
  if(sync.err) return `<div class="banner err">⚠ ${esc(sync.err)}
      <button class="btn sm" data-act="sync-now">${esc(t('sync_now'))}</button></div>`;
  return '';
}
function render(){
  renderNav();
  const scroll=window.scrollY;
  document.getElementById('main').innerHTML = banner() + ((VIEWS[route]||viewDash)());
  window.scrollTo(0,scroll);
  const old=document.querySelector('.backdrop'); if(old) old.remove();
  if(modal){
    const b=document.createElement('div'); b.className='backdrop';
    b.innerHTML=`<div class="modal ${modal.size}" role="dialog" aria-modal="true">${modal.render()}</div>`;
    document.body.appendChild(b);
  }
}
function copyText(txt){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>toast('✓ '+t('copied')),()=>toast('⚠'));
  } else {
    const ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta);
    ta.select(); try{ document.execCommand('copy'); toast('✓ '+t('copied')); }catch(e){}
    ta.remove();
  }
}

document.addEventListener('click', async e=>{
  const rb=e.target.closest('[data-route]');
  if(rb){ route=rb.dataset.route; modal=null; draft=null; window.scrollTo(0,0); render(); return; }
  const lb=e.target.closest('[data-lang]');
  if(lb){ lang=lb.dataset.lang; try{localStorage.setItem(LS_LANG,lang)}catch(x){} render(); return; }
  const fb=e.target.closest('[data-filter]');
  if(fb){ ui[fb.dataset.filter+'Filter']=fb.dataset.val; render(); return; }
  const b=e.target.closest('[data-act]'); if(!b) return;
  const a=b.dataset.act, id=b.dataset.id, kind=b.dataset.kind;
  switch(a){
    case 'close': closeModal(); break;
    case 'new-prod': modalProduct(null); break;
    case 'edit-prod': modalProduct(id); break;
    case 'save-prod': saveProduct(id); break;
    case 'del-prod': if(confirm(t('confirm_del'))){ delDoc('products',id); toast(t('deleted')); } break;
    case 'lots': modalLots(id); break;
    case 'new-in': modalLot(null); break;
    case 'edit-lot': modalLot(id); break;
    case 'save-lot': saveLot(id); break;
    case 'del-lot': if(confirm(t('confirm_del'))){ delDoc('lots',id); toast(t('deleted')); } break;
    case 'new-wh': modalWh(null); break;
    case 'edit-wh': modalWh(id); break;
    case 'save-wh': saveWh(id); break;
    case 'del-wh': if(confirm(t('confirm_del'))){ delDoc('warehouses',id); toast(t('deleted')); } break;
    case 'new-transfer': modalTransfer(); break;
    case 'save-transfer': await saveTransfer(); break;
    case 'new-part': modalPartner(null); break;
    case 'edit-part': modalPartner(id); break;
    case 'save-part': savePartner(id); break;
    case 'del-part': if(confirm(t('confirm_del'))){ delDoc('partners',id); toast(t('deleted')); } break;
    case 'new-inv': modalDoc('inv',null); break;
    case 'new-quo': modalDoc('quo',null); break;
    case 'edit-doc': modalDoc(kind,id); break;
    case 'del-doc': if(confirm(t('confirm_del'))){ delDoc(kind==='quo'?'quotes':'invoices',id); toast(t('deleted')); } break;
    case 'add-item': draft.doc.items.push(emptyItem()); render(); break;
    case 'rm-item': draft.doc.items.splice(+b.dataset.i,1); if(!draft.doc.items.length) draft.doc.items.push(emptyItem()); render(); break;
    case 'save-doc': await saveDoc(b.dataset.issue==='1', b.dataset.mark); break;
    case 'issue': if(confirm(t('issue')+'?')) await issueExisting(id); break;
    case 'void': if(confirm(t('voidit')+'?')) await voidInvoice(id); break;
    case 'convert': convertQuote(id); break;
    case 'new-rcpt': modalReceipt(null); break;
    case 'pay-inv': modalReceipt(id); break;
    case 'save-rcpt': await saveReceipt(); break;
    case 'del-rcpt': if(confirm(t('confirm_del'))){ delDoc('receipts',id); toast(t('deleted')); } break;
    case 'print-rcpt': printReceipt(id); break;
    case 'print-doc': printDoc(kind,id); break;
    case 'print-rep': printReport(); break;
    case 'export-rep': exportReport(); break;
    case 'export-all': exportStock(); break;
    case 'import-open': modalImport(); break;
    case 'imp-template': importTemplate(); break;
    case 'imp-back': imp.step--; render(); break;
    case 'imp-next': imp.step=3; render(); break;
    case 'imp-run': await runImport(); break;
    case 'install': if(deferredInstall){ deferredInstall.prompt(); deferredInstall=null; } break;
    case 'copy-sql': copyText(SQL_SETUP); break;
    case 'copy-link': copyText(setupLink()); break;
    case 'show-qr': showQR(); break;
    case 'sync-now': await syncNow(); break;
    case 'rm-logo': if(confirm(t('rm_logo')+'?')){ await putSettings({logo:''}); toast(t('saved')); } break;
    case 'export-json': exportJSON(); break;
    case 'seed-demo': if(confirm(t('demo')+'?')) await seedDemo(); break;
    case 'wipe': if(confirm(t('wipe')+'?')){ Docs={}; meta={lastSync:''}; persist(); rebuild(); render(); toast(t('deleted')); } break;
    case 'save-cfg': {
      cfg={url:gv('c_url').trim().replace(/\/+$/,''), key:gv('c_key').trim(), device:gv('c_dev').trim()};
      lsSet(CFG_KEY,cfg);
      Object.values(Docs).forEach(d=>d.dirty=true); persist();
      meta.lastSync='';
      await syncNow();
      toast(sync.ok?'✓ '+t('sync_on'):'⚠ '+(sync.err||'')); render(); break; }
    case 'save-set': {
      putSettings({companyLa:gv('s_companyLa'),companyEn:gv('s_companyEn'),address:gv('s_address'),
        phone:gv('s_phone'),taxId:gv('s_taxId'),bank:gv('s_bank'),rateUSD:n(gv('s_rateUSD')),vat:n(gv('s_vat'))});
      toast(t('saved')); break; }
  }
});

/* live typing inside editors — update the model, refresh computed cells only */
document.addEventListener('input', async e=>{
  const el=e.target;
  if(el.id==='psearch'){ ui.pSearch=el.value; const pos=el.selectionStart; render();
    const f=document.getElementById('psearch'); if(f){ f.focus(); f.setSelectionRange(pos,pos); } return; }
  if(el.id==='repmonth'){ ui.repMonth=el.value; render(); return; }
  if(el.id==='whfilter'){ ui.whFilter=el.value; render(); return; }
  if(el.id==='impfile'){ await handleImportFile(el.files&&el.files[0]); return; }
  if(el.id==='jsonfile'){ if(el.files&&el.files[0]) importJSON(el.files[0]); return; }
  if(el.id==='logofile'){
    const f=el.files&&el.files[0]; if(!f) return;
    try{ await putSettings({logo: await readLogo(f)}); toast(t('saved')); }
    catch(err){ toast('⚠ '+t('imp_err')); }
    return;
  }
  if(draft && draft.doc && el.dataset.item!=null && el.dataset.field && el.tagName!=='SELECT'){
    const it=draft.doc.items[+el.dataset.item], f=el.dataset.field;
    it[f] = ['qty','price','discount'].includes(f) ? n(el.value) : el.value;
    refreshDocTotals(); return;
  }
  if(draft && draft.doc && el.dataset.dfield && el.tagName!=='SELECT'){
    const f=el.dataset.dfield;
    draft.doc[f] = f==='vat' ? n(el.value) : el.value;
    refreshDocTotals(); return;
  }
  if(draft && draft.doc && el.dataset.rfield && el.tagName!=='SELECT'){ draft.doc[el.dataset.rfield]=el.value; return; }
  if(draft && draft.kind==='tr' && el.dataset.tr && el.tagName!=='SELECT'){
    draft[el.dataset.tr] = el.dataset.tr==='qty' ? n(el.value) : el.value; return;
  }
  if(el.dataset.payamt!=null){
    const row=(draft.doc.items||[]).find(x=>x.invoiceId===el.dataset.payamt);
    if(row){ row.amount=n(el.value); recalcReceipt();
      const a=document.getElementById('r_amt'); if(a) a.textContent=fmtK(draft.doc.amount)+' ₭'; }
    return;
  }
});
document.addEventListener('change', async e=>{
  const el=e.target;
  if(el.dataset.pick!=null){
    const invId=el.dataset.pick, inv=S.invoices.find(x=>x.id===invId);
    draft.doc.items=(draft.doc.items||[]).filter(x=>x.invoiceId!==invId);
    if(el.checked && inv) draft.doc.items.push({invoiceId:invId, no:inv.no, amount:outstanding(inv)});
    recalcReceipt(); render(); return;
  }
  if(el.dataset.map!=null){ imp.map[el.dataset.map] = el.value===''?null:+el.value; return; }
  if(el.dataset.imp==='sheet'){ selectSheet(el.value); return; }
  if(el.tagName!=='SELECT') return;
  if(draft && draft.kind==='tr' && el.dataset.tr){
    draft[el.dataset.tr]=el.value;
    if(el.dataset.tr==='productId'||el.dataset.tr==='fromWh') draft.lotId='';
    render(); return;
  }
  if(draft && draft.doc && el.dataset.rfield){
    draft.doc[el.dataset.rfield]=el.value;
    if(el.dataset.rfield==='customerId'){
      const c=partner(el.value); draft.doc.customerName=c?c.name:'';
      draft.doc.items=[]; recalcReceipt();
    }
    render(); return;
  }
  if(el.dataset.item!=null && el.dataset.field){ itemChange(+el.dataset.item, el.dataset.field, el.value); return; }
  if(el.dataset.dfield){ docFieldChange(el.dataset.dfield, el.value); return; }
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && modal) closeModal(); });

/* ---- import file handling ---- */
async function handleImportFile(file){
  if(!file) return;
  imp.fileName=file.name;
  try{
    if(/\.csv$/i.test(file.name)){
      const txt=await file.text();
      const rows=parseCSV(txt);
      if(!rows.length) throw new Error('empty');
      imp.headers=rows[0]; imp.rows=rows.slice(1).filter(r=>r.some(c=>String(c||'').trim()));
      imp.sheetNames=[]; imp.map=guessMap(imp.headers); imp.step=2; render(); return;
    }
    const XLSX=await loadXLSX();
    const buf=await file.arrayBuffer();
    imp.wb=XLSX.read(buf,{type:'array',cellDates:true});
    imp.sheetNames=imp.wb.SheetNames;
    selectSheet(imp.sheetNames[0]);
  }catch(err){ toast('⚠ '+t('imp_err')+(err&&err.message==='offline'?' (offline)':'')); }
}
function selectSheet(name){
  const XLSX=window.XLSX; if(!XLSX||!imp.wb) return;
  imp.sheet=name;
  const rows=XLSX.utils.sheet_to_json(imp.wb.Sheets[name],{header:1,raw:false,defval:'',blankrows:false});
  imp.headers=rows[0]||[];
  imp.rows=rows.slice(1).filter(r=>r.some(c=>String(c||'').trim()));
  imp.map=guessMap(imp.headers); imp.step=2; render();
}
function parseCSV(text){
  text=text.replace(/^﻿/,'');
  const rows=[]; let row=[], cur='', q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; }
    else if(c==='"') q=true;
    else if(c===','){ row.push(cur); cur=''; }
    else if(c==='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
    else if(c!=='\r') cur+=c;
  }
  if(cur!==''||row.length){ row.push(cur); rows.push(row); }
  return rows;
}

/* ---- QR for the setup link ---- */
function showQR(){
  const link=setupLink();
  openModal(()=>`<header><h2>${esc(t('share_link'))}</h2><button class="btn ghost" data-act="close">✕</button></header>
    <div class="body" style="text-align:center">
      <div id="qrbox" style="display:inline-block;background:#fff;padding:14px;border-radius:10px"></div>
      <p class="sub2" style="word-break:break-all;margin-top:14px">${esc(link)}</p>
    </div>
    <div class="foot"><button class="btn" data-act="copy-link">${esc(t('copy'))}</button>
      <button class="btn primary" data-act="close">${esc(t('close'))}</button></div>`,'narrow');
  const draw=()=>{
    const box=document.getElementById('qrbox'); if(!box) return;
    try{ new window.QRCode(box,{text:link,width:220,height:220,correctLevel:window.QRCode.CorrectLevel.M}); }
    catch(e){ box.innerHTML='<span style="color:#666;font-size:12px">QR offline</span>'; }
  };
  if(window.QRCode) return setTimeout(draw,50);
  const s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  s.onload=()=>setTimeout(draw,50);
  s.onerror=()=>{ const box=document.getElementById('qrbox'); if(box) box.innerHTML='<span style="color:#666;font-size:12px">QR offline</span>'; };
  document.head.appendChild(s);
}

/* ---- PWA plumbing ---- */
if(MODE==='pwa'){
  window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredInstall=e; scheduleRender(); });
  if('serviceWorker' in navigator)
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

render();
initStore();
