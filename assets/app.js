/* =========================
   FULL DEMO APP (no backend)
   - Approve/Reject (single & bulk)
   - Search/Filter/Find
   - Export CSV (sheet)
   - Attachments (metadata)
   - Persist by localStorage
   ========================= */

const $ = (q, el=document)=>el.querySelector(q);
const $$ = (q, el=document)=>[...el.querySelectorAll(q)];
const fmtVnd = (n)=> (n||0).toLocaleString("vi-VN") + " VND";
const nowStr = ()=> {
  const d = new Date();
  const pad = (x)=> String(x).padStart(2,"0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const STORAGE_KEY = "INTERNAL_PORTAL_DEMO_V2";

/* -------------------------
   Seed Data
-------------------------- */
const SEED = {
  user: { name: "Nguyễn Việt", email: "nguyenviet@company.com", dept: "Vận hành", branch: "Trụ sở chính", role: "Admin" },

  tetCampaign: {
    name: "Đổi tiền Tết 2026",
    status: "Đang mở",
    start: "20/12/2025",
    end: "20/01/2026",
    minVnd: 200000,
    maxVnd: 2000000,
    paymentMethods: ["Tiền mặt", "Chuyển khoản nội bộ", "Tiền cũ (đạt chuẩn)"],
    denominations: [10000, 20000, 50000],
    slotQuotaBills: 500
  },

  programs: {
    plants: {
      name: "Green Office",
      rule: "Mỗi nhân viên 1 cây/đợt",
      items: ["Cây lưỡi hổ mini", "Cây trầu bà", "Cây sen đá"]
    },
    supplies: {
      monthLimit: 2,
      note: "Trong định mức auto duyệt; vượt định mức chuyển duyệt."
    }
  },

  inventory: [
    { code:"SUP-001", name:"Túi rác đen 60×80", group:"Đồ dùng", unit:"Cuộn", stock:120, min:50, warehouse:"Kho Trụ sở" },
    { code:"SUP-014", name:"Túi rác phân loại (xanh)", group:"Đồ dùng", unit:"Cuộn", stock:18, min:30, warehouse:"Kho Trụ sở" },
    { code:"PL-002", name:"Cây lưỡi hổ mini", group:"Cây cảnh", unit:"Cây", stock:42, min:20, warehouse:"Kho Sảnh" },
  ],

  // status: draft/pending/approved/processing/done/rejected/cancelled
  requests: [
    {
      id:"REQ-1023", service:"Đổi tiền Tết", created:"16/12/2025", status:"pending",
      pickup:"22/12 • 10:00 (Tầng 5)", note:"Chờ quản lý duyệt", branch:"Trụ sở chính",
      createdBy:{ name:"Nguyễn Việt", email:"nguyenviet@company.com" },
      attachments: [],
      details:{
        type:"tet",
        items:[{denom:10000, qty:100},{denom:20000, qty:50}],
        payment:"Chuyển khoản nội bộ",
        ref:"IB-778812",
        total: 10000*100 + 20000*50
      },
      audit:[
        { time:"16/12/2025 09:12", action:"Tạo yêu cầu", by:"Nguyễn Việt", note:"—" }
      ]
    },
    {
      id:"REQ-1018", service:"Cấp túi rác / đồ dùng", created:"14/12/2025", status:"processing",
      pickup:"Hôm nay • 16:00 (Kho)", note:"Đang chuẩn bị hàng", branch:"Trụ sở chính",
      createdBy:{ name:"Trần Minh", email:"tranminh@company.com" },
      attachments: [],
      details:{ type:"supply", items:[{code:"SUP-014", name:"Túi rác phân loại (xanh)", qty:1, unit:"Cuộn"}], monthCount:1 },
      audit:[
        { time:"14/12/2025 10:00", action:"Tạo yêu cầu", by:"Trần Minh", note:"—" },
        { time:"14/12/2025 10:05", action:"Chuyển xử lý", by:"Hệ thống", note:"Đưa sang kho" }
      ]
    },
    {
      id:"REQ-1009", service:"Cây cảnh", created:"10/12/2025", status:"done",
      pickup:"12/12 • 15:30 (Sảnh)", note:"Đã check-in nhận", branch:"Chi nhánh A",
      createdBy:{ name:"Lê Hương", email:"lehuong@company.com" },
      attachments: [],
      details:{ type:"plant", plantName:"Cây lưỡi hổ mini", qty:1, program:"Green Office" },
      audit:[
        { time:"10/12/2025 09:00", action:"Tạo yêu cầu", by:"Lê Hương", note:"—" },
        { time:"12/12/2025 15:40", action:"Hoàn tất", by:"Kho • OPS", note:"Đã bàn giao" }
      ]
    },
  ],

  inventoryAudit: [
    { time:"16/12/2025 15:40", type:"Xuất", code:"SUP-001", qty:"5 cuộn", ref:"REQ-1018", by:"Kho • OPS", note:"Xuất theo định mức" },
    { time:"15/12/2025 10:12", type:"Nhập", code:"PL-002", qty:"20 cây", ref:"-", by:"Kho • OPS", note:"Bổ sung chương trình" },
  ]
};

/* -------------------------
   State load/save
-------------------------- */
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return structuredClone(SEED);
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
}
function resetDemo(){
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

let DB = loadState();

/* -------------------------
   Helpers
-------------------------- */
function getPath(){ return location.pathname.split("/").pop() || "index.html"; }
function getQuery(name){ return new URL(location.href).searchParams.get(name); }
function findReq(id){ return DB.requests.find(x=>x.id===id) || DB.requests[0]; }

function statusLabel(st){
  const map = {
    draft:"Nháp",
    pending:"Chờ duyệt",
    approved:"Đã duyệt",
    processing:"Đang xử lý",
    done:"Hoàn tất",
    rejected:"Từ chối",
    cancelled:"Đã hủy"
  };
  return map[st] || "—";
}
function statusPill(st){
  const cls = (st==="pending")?"pending"
            : (st==="processing"||st==="approved")?"processing"
            : (st==="done")?"done"
            : (st==="rejected"||st==="cancelled")?"rejected"
            : "";
  return `<span class="pill ${cls}"><span class="dot"></span> ${statusLabel(st)}</span>`;
}

function addAudit(reqId, action, by, note=""){
  const r = findReq(reqId);
  r.audit ||= [];
  r.audit.unshift({ time: nowStr(), action, by, note: note || "—" });
  saveState();
}

/* -------------------------
   CSV Export (Excel mở được)
-------------------------- */
function downloadCSV(filename, rows){
  // rows: array of objects
  if(!rows || !rows.length){
    alert("Không có dữ liệu để xuất.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const esc = (v)=>{
    if(v===null||v===undefined) return "";
    const s = String(v).replaceAll('"','""');
    return `"${s}"`;
  };
  const csv = [
    headers.join(","),
    ...rows.map(r=>headers.map(h=>esc(r[h])).join(","))
  ].join("\n");

  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* -------------------------
   UI: sidebar & active nav
-------------------------- */
function bindGlobalUI(){
  // active nav
  const path = getPath();
  $$(".nav a").forEach(a=>{
    if(a.getAttribute("href")?.includes(path)) a.classList.add("active");
  });

  // demo reset button if exists
  $("#btnResetDemo")?.addEventListener("click", resetDemo);
}

/* =========================
   RENDER: USER
========================== */
function renderUserHeader(){
  const nameEl = $("#userName");
  if(nameEl) nameEl.textContent = DB.user.name;
}

function renderMyRequests(tableId){
  const tbody = $(`#${tableId} tbody`);
  if(!tbody) return;
  tbody.innerHTML = DB.requests
    .slice()
    .sort((a,b)=> b.created.localeCompare(a.created))
    .map(r=>`
      <tr>
        <td><a href="request-detail.html?id=${r.id}" style="color:var(--primary);font-weight:900">${r.id}</a></td>
        <td>${r.service}</td>
        <td>${r.created}</td>
        <td>${statusPill(r.status)}</td>
        <td>${r.pickup}</td>
        <td style="color:var(--muted)">${r.note || ""}</td>
      </tr>
    `).join("");
}

/* request detail (user/admin) */
function detailBlock(r){
  if(r.details?.type==="tet"){
    const rows = (r.details.items||[]).map(x=>`<tr><td>${Number(x.denom).toLocaleString("vi-VN")}</td><td>${x.qty}</td><td>${fmtVnd(x.denom*x.qty)}</td></tr>`).join("");
    const cfg = DB.tetCampaign;
    return `
      <div class="card">
        <h2>Thông tin đổi tiền</h2>
        <div class="sub">
          Min: ${fmtVnd(cfg.minVnd)} • Max: ${fmtVnd(cfg.maxVnd)} • Nộp tiền: <b>${r.details.payment}</b>
        </div>
        <div class="table-wrap" style="margin-top:12px">
          <table>
            <thead><tr><th>Mệnh giá</th><th>Số lượng</th><th>Thành tiền</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr><td colspan="2" style="font-weight:900">Tổng</td><td style="font-weight:900">${fmtVnd(r.details.total)}</td></tr></tfoot>
          </table>
        </div>
        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <span class="pill"><i class="fa-regular fa-credit-card"></i> Ref: ${r.details.ref||"—"}</span>
          <span class="pill"><i class="fa-regular fa-calendar"></i> Lịch nhận: ${r.pickup}</span>
        </div>
      </div>
    `;
  }

  if(r.details?.type==="supply"){
    const it = (r.details.items||[]).map(x=>`<tr><td>${x.code}</td><td>${x.name}</td><td>${x.qty} ${x.unit}</td></tr>`).join("");
    return `
      <div class="card">
        <h2>Thông tin cấp đồ dùng</h2>
        <div class="sub">Định mức tháng (demo): ${r.details.monthCount||0}/${DB.programs.supplies.monthLimit}</div>
        <div class="table-wrap" style="margin-top:12px">
          <table>
            <thead><tr><th>Mã</th><th>Tên</th><th>Số lượng</th></tr></thead>
            <tbody>${it}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  if(r.details?.type==="plant"){
    return `
      <div class="card">
        <h2>Thông tin cây cảnh</h2>
        <div class="sub">Chương trình: ${r.details.program} • Quy tắc: ${DB.programs.plants.rule}</div>
        <div style="margin-top:12px; display:grid; gap:10px;">
          <div class="pill"><i class="fa-solid fa-seedling"></i> Loại cây: <b>${r.details.plantName}</b></div>
          <div class="pill"><i class="fa-regular fa-square-check"></i> Số lượng: <b>${r.details.qty}</b></div>
          <div class="pill"><i class="fa-regular fa-calendar"></i> Lịch nhận: <b>${r.pickup}</b></div>
        </div>
      </div>
    `;
  }

  return `<div class="card"><h2>Chi tiết</h2><div class="sub">—</div></div>`;
}

function renderRequestDetail(containerId, mode="user"){
  const el = $(`#${containerId}`);
  if(!el) return;
  const id = getQuery("id");
  const r = findReq(id);

  el.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;">
        <div>
          <h2>Chi tiết yêu cầu • ${r.id}</h2>
          <div class="sub">${r.service} • ${r.branch} • Tạo ngày ${r.created} • Người tạo: ${r.createdBy?.name || "—"}</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          ${statusPill(r.status)}
          ${mode==="admin" ? `
            <button class="btn small primary" id="btnApprove"><i class="fa-solid fa-check"></i> Duyệt</button>
            <button class="btn small danger" id="btnReject"><i class="fa-solid fa-xmark"></i> Từ chối</button>
            <button class="btn small" id="btnSetProcessing"><i class="fa-solid fa-hourglass"></i> Sang xử lý</button>
            <button class="btn small" id="btnSetDone"><i class="fa-solid fa-circle-check"></i> Hoàn tất</button>
          ` : ``}
        </div>
      </div>
    </div>

    ${detailBlock(r)}

    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">
        <div>
          <h2>Đính kèm (demo)</h2>
          <div class="sub">Chọn file để lưu metadata; triển khai thật sẽ upload lên server/S3.</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <input id="fileAttach" type="file" />
          <button class="btn" id="btnExportReq"><i class="fa-solid fa-file-csv"></i> Xuất sheet</button>
        </div>
      </div>
      <div id="attachList" style="margin-top:12px; display:grid; gap:10px"></div>
    </div>

    <div class="card">
      <h2>Audit log</h2>
      <div class="sub">Ai • lúc nào • hành động • ghi chú.</div>
      <div class="table-wrap" style="margin-top:12px">
        <table>
          <thead><tr><th>Thời gian</th><th>Hành động</th><th>Người thực hiện</th><th>Ghi chú</th></tr></thead>
          <tbody>
            ${(r.audit||[]).map(a=>`
              <tr><td>${a.time}</td><td>${a.action}</td><td>${a.by}</td><td>${a.note||""}</td></tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Attachments render + add
  const attachList = $("#attachList");
  const renderAttach = ()=>{
    const rr = findReq(r.id);
    const files = rr.attachments || [];
    attachList.innerHTML = files.length ? files.map(f=>`
      <div class="pill" style="justify-content:space-between">
        <span><i class="fa-regular fa-paperclip"></i> <b>${f.name}</b> • ${f.size} • ${f.time}</span>
        <button class="btn small danger" data-del="${f.id}"><i class="fa-solid fa-trash"></i></button>
      </div>
    `).join("") : `<div class="sub">Chưa có file.</div>`;

    $$("[data-del]").forEach(btn=>{
      btn.onclick = ()=>{
        const idDel = btn.getAttribute("data-del");
        rr.attachments = rr.attachments.filter(x=>x.id!==idDel);
        addAudit(rr.id, "Xóa đính kèm", DB.user.name, `FileId: ${idDel}`);
        saveState();
        renderAttach();
      };
    });
  };

  $("#fileAttach")?.addEventListener("change", (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    const rr = findReq(r.id);
    rr.attachments ||= [];
    rr.attachments.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
      name: file.name,
      size: `${Math.round(file.size/1024)} KB`,
      time: nowStr()
    });
    addAudit(rr.id, "Thêm đính kèm", DB.user.name, file.name);
    saveState();
    e.target.value = "";
    renderAttach();
  });

  $("#btnExportReq")?.addEventListener("click", ()=>{
    const rr = findReq(r.id);
    downloadCSV(`request_${rr.id}`, [{
      id: rr.id,
      service: rr.service,
      status: statusLabel(rr.status),
      created: rr.created,
      pickup: rr.pickup,
      branch: rr.branch,
      createdBy: rr.createdBy?.name || "",
      note: rr.note || "",
      payment: rr.details?.payment || "",
      ref: rr.details?.ref || "",
      total: rr.details?.total || ""
    }]);
  });

  renderAttach();

  // Admin action buttons
  if(mode==="admin"){
    $("#btnApprove")?.addEventListener("click", ()=> adminSetStatus(r.id, "approved", "Duyệt", "Admin duyệt"));
    $("#btnReject")?.addEventListener("click", ()=>{
      const reason = prompt("Lý do từ chối (demo):") || "—";
      adminSetStatus(r.id, "rejected", "Từ chối", reason);
    });
    $("#btnSetProcessing")?.addEventListener("click", ()=> adminSetStatus(r.id, "processing", "Sang xử lý", "Chuyển kho/OPS"));
    $("#btnSetDone")?.addEventListener("click", ()=> adminSetStatus(r.id, "done", "Hoàn tất", "Đã bàn giao"));
  }
}

function adminSetStatus(reqId, newStatus, actionName, note){
  const r = findReq(reqId);
  r.status = newStatus;
  addAudit(reqId, actionName, "Admin • OPS", note);
  saveState();
  alert(`OK: ${reqId} -> ${statusLabel(newStatus)}`);
  location.reload();
}

/* =========================
   ADMIN: Approvals full
   - Search/filter
   - Bulk approve/reject
   - Export CSV
========================== */
function renderAdminApprovals(){
  const tbody = $("#adminApprovalBody");
  if(!tbody) return;

  const q = ($("#apSearch")?.value || "").trim().toLowerCase();
  const service = $("#apService")?.value || "all";
  const status = $("#apStatus")?.value || "all";
  const branch = $("#apBranch")?.value || "all";

  const filtered = DB.requests.filter(r=>{
    const hay = `${r.id} ${r.service} ${r.createdBy?.name||""} ${r.note||""}`.toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(service!=="all" && r.service!==service) return false;
    if(status!=="all" && r.status!==status) return false;
    if(branch!=="all" && r.branch!==branch) return false;
    return true;
  });

  tbody.innerHTML = filtered.map(r=>`
    <tr data-id="${r.id}">
      <td><input class="chk" type="checkbox"/></td>
      <td><a href="admin-request-detail.html?id=${r.id}" style="color:var(--primary);font-weight:900">${r.id}</a></td>
      <td>${r.createdBy?.name||"—"}</td>
      <td>${r.service}</td>
      <td>${r.branch}</td>
      <td>${r.created}</td>
      <td>${statusPill(r.status)}</td>
      <td>${r.pickup}</td>
      <td style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn small primary btn-approve"><i class="fa-solid fa-check"></i> Duyệt</button>
        <button class="btn small danger btn-reject"><i class="fa-solid fa-xmark"></i> Từ chối</button>
      </td>
    </tr>
  `).join("");

  // Row actions
  $$(".btn-approve").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.closest("tr").dataset.id;
      adminSetStatus(id, "approved", "Duyệt", "Duyệt từ danh sách");
    };
  });
  $$(".btn-reject").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.closest("tr").dataset.id;
      const reason = prompt("Lý do từ chối (demo):") || "—";
      adminSetStatus(id, "rejected", "Từ chối", reason);
    };
  });

  // summary
  $("#apCount") && ($("#apCount").textContent = filtered.length);
}

function bindAdminApprovals(){
  if(!$("#adminApprovalBody")) return;

  const rerender = ()=>renderAdminApprovals();

  ["apSearch","apService","apStatus","apBranch"].forEach(id=>{
    $(`#${id}`)?.addEventListener("input", rerender);
    $(`#${id}`)?.addEventListener("change", rerender);
  });

  $("#btnApRefresh")?.addEventListener("click", ()=>{
    $("#apSearch").value="";
    $("#apService").value="all";
    $("#apStatus").value="all";
    $("#apBranch").value="all";
    renderAdminApprovals();
  });

  $("#btnApSelectAll")?.addEventListener("click", ()=>{
    const all = $$(".chk");
    const hasUnchecked = all.some(x=>!x.checked);
    all.forEach(x=> x.checked = hasUnchecked);
  });

  $("#btnApBulkApprove")?.addEventListener("click", ()=>{
    const ids = $$(".chk").filter(x=>x.checked).map(x=>x.closest("tr").dataset.id);
    if(!ids.length) return alert("Chọn ít nhất 1 yêu cầu.");
    ids.forEach(id=>{
      const r = findReq(id);
      r.status = "approved";
      addAudit(id, "Duyệt", "Admin • OPS", "Duyệt hàng loạt");
    });
    saveState();
    alert(`Đã duyệt ${ids.length} yêu cầu (demo).`);
    renderAdminApprovals();
  });

  $("#btnApBulkReject")?.addEventListener("click", ()=>{
    const ids = $$(".chk").filter(x=>x.checked).map(x=>x.closest("tr").dataset.id);
    if(!ids.length) return alert("Chọn ít nhất 1 yêu cầu.");
    const reason = prompt("Lý do từ chối (demo):") || "—";
    ids.forEach(id=>{
      const r = findReq(id);
      r.status = "rejected";
      addAudit(id, "Từ chối", "Admin • OPS", `Bulk: ${reason}`);
    });
    saveState();
    alert(`Đã từ chối ${ids.length} yêu cầu (demo).`);
    renderAdminApprovals();
  });

  $("#btnApExport")?.addEventListener("click", ()=>{
    // export current filtered view
    const q = ($("#apSearch")?.value || "").trim().toLowerCase();
    const service = $("#apService")?.value || "all";
    const status = $("#apStatus")?.value || "all";
    const branch = $("#apBranch")?.value || "all";

    const rows = DB.requests
      .filter(r=>{
        const hay = `${r.id} ${r.service} ${r.createdBy?.name||""} ${r.note||""}`.toLowerCase();
        if(q && !hay.includes(q)) return false;
        if(service!=="all" && r.service!==service) return false;
        if(status!=="all" && r.status!==status) return false;
        if(branch!=="all" && r.branch!==branch) return false;
        return true;
      })
      .map(r=>({
        id:r.id,
        service:r.service,
        status:statusLabel(r.status),
        created:r.created,
        pickup:r.pickup,
        branch:r.branch,
        createdBy:r.createdBy?.name||"",
        note:r.note||""
      }));

    downloadCSV("approvals_export", rows);
  });

  // Find by ID quick
  $("#btnApFind")?.addEventListener("click", ()=>{
    const id = (prompt("Nhập mã yêu cầu (VD: REQ-1023):") || "").trim().toUpperCase();
    if(!id) return;
    const found = DB.requests.find(x=>x.id===id);
    if(!found) return alert("Không tìm thấy mã này.");
    location.href = `admin-request-detail.html?id=${found.id}`;
  });

  renderAdminApprovals();
}

/* =========================
   ADMIN: Inventory full
   - Search/filter
   - Export CSV inventory + audit
========================== */
function renderAdminInventory(){
  const tbody = $("#invBody");
  if(!tbody) return;

  const q = ($("#invSearch")?.value || "").trim().toLowerCase();
  const warehouse = $("#invWarehouse")?.value || "all";
  const lowOnly = $("#invLowOnly")?.checked || false;

  const rows = DB.inventory.filter(x=>{
    const hay = `${x.code} ${x.name} ${x.group}`.toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(warehouse!=="all" && x.warehouse!==warehouse) return false;
    if(lowOnly && !(x.stock < x.min)) return false;
    return true;
  });

  tbody.innerHTML = rows.map(x=>`
    <tr>
      <td>${x.code}</td>
      <td>${x.name}</td>
      <td>${x.group}</td>
      <td>${x.unit}</td>
      <td style="font-weight:900; color:${x.stock<x.min ? "var(--rose)" : "inherit"}">${x.stock}</td>
      <td>${x.min}</td>
      <td>${x.warehouse}</td>
      <td style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn small" data-out="${x.code}"><i class="fa-solid fa-arrow-up-from-bracket"></i> Xuất</button>
        <button class="btn small primary" data-in="${x.code}"><i class="fa-solid fa-plus"></i> Nhập</button>
      </td>
    </tr>
  `).join("");

  // Bind stock in/out
  $$("[data-in]").forEach(btn=>{
    btn.onclick = ()=>{
      const code = btn.getAttribute("data-in");
      const qty = Number(prompt(`Nhập kho ${code} số lượng:`) || "0");
      if(qty<=0) return;
      const item = DB.inventory.find(i=>i.code===code);
      item.stock += qty;
      DB.inventoryAudit.unshift({
        time: nowStr(),
        type:"Nhập",
        code,
        qty: `${qty} ${item.unit}`,
        ref: "-",
        by:"Kho • OPS",
        note:"Nhập kho (demo)"
      });
      saveState();
      renderAdminInventory();
      renderInventoryAudit();
    };
  });

  $$("[data-out]").forEach(btn=>{
    btn.onclick = ()=>{
      const code = btn.getAttribute("data-out");
      const item = DB.inventory.find(i=>i.code===code);
      const qty = Number(prompt(`Xuất kho ${code} số lượng:`) || "0");
      if(qty<=0) return;
      if(item.stock - qty < 0) return alert("Không đủ tồn kho.");
      item.stock -= qty;
      DB.inventoryAudit.unshift({
        time: nowStr(),
        type:"Xuất",
        code,
        qty: `${qty} ${item.unit}`,
        ref: "-",
        by:"Kho • OPS",
        note:"Xuất kho (demo)"
      });
      saveState();
      renderAdminInventory();
      renderInventoryAudit();
    };
  });

  $("#invCount") && ($("#invCount").textContent = rows.length);
}

function renderInventoryAudit(){
  const auditBody = $("#auditBody");
  if(!auditBody) return;
  auditBody.innerHTML = DB.inventoryAudit.map(a=>`
    <tr>
      <td>${a.time}</td><td>${a.type}</td><td>${a.code}</td><td>${a.qty}</td><td>${a.ref}</td><td>${a.by}</td><td>${a.note}</td>
    </tr>
  `).join("");
}

function bindAdminInventory(){
  if(!$("#invBody")) return;

  const rer = ()=> renderAdminInventory();
  $("#invSearch")?.addEventListener("input", rer);
  $("#invWarehouse")?.addEventListener("change", rer);
  $("#invLowOnly")?.addEventListener("change", rer);

  $("#btnInvExport")?.addEventListener("click", ()=>{
    const rows = DB.inventory.map(x=>({
      code:x.code, name:x.name, group:x.group, unit:x.unit, stock:x.stock, min:x.min, warehouse:x.warehouse
    }));
    downloadCSV("inventory_export", rows);
  });

  $("#btnAuditExport")?.addEventListener("click", ()=>{
    downloadCSV("inventory_audit_export", DB.inventoryAudit);
  });

  renderAdminInventory();
  renderInventoryAudit();
}

/* =========================
   Admin: Tet Campaign save
========================== */
function bindTetCampaign(){
  if(!$("#tetName")) return;
  $("#btnTetSave")?.addEventListener("click", ()=>{
    DB.tetCampaign.name = $("#tetName").value;
    DB.tetCampaign.minVnd = Number($("#tetMin").value||0);
    DB.tetCampaign.maxVnd = Number($("#tetMax").value||0);
    saveState();
    alert("Đã lưu cấu hình đợt Tết (demo).");
  });
  // prefill
  $("#tetName").value = DB.tetCampaign.name;
  $("#tetMin").value = DB.tetCampaign.minVnd;
  $("#tetMax").value = DB.tetCampaign.maxVnd;
}

/* =========================
   Init
========================== */
document.addEventListener("DOMContentLoaded", ()=>{
  bindGlobalUI();

  // User
  renderUserHeader();
  renderMyRequests("myReqTable");
  renderMyRequests("myReqTable2");

  // Details
  renderRequestDetail("reqDetailUser", "user");
  renderRequestDetail("reqDetailAdmin", "admin");

  // Admin pages
  bindAdminApprovals();
  bindAdminInventory();
  bindTetCampaign();
});
