(function(){
  "use strict";

  // ------- Minimal state shape -------
  const STORAGE_KEY = "pp-resume-v1";
  const emptyState = {
    version: 1,
    contact: { fullName:"", title:"", email:"", phone:"", location:"", links:[{label:"", url:""}] },
    summary: "",
    skills: [],
    experience: [],
    education: [],
    projects: []
  };

  let state = load() || emptyState;

  // ------- Utilities -------
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function save(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e){}
  }
  let saveTimer;
  function autosave(){ clearTimeout(saveTimer); saveTimer = setTimeout(save, 500); }
  function load(){
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; }
    catch(e){ return null; }
  }
  function sanitize(str){ return (str || "").toString().trim(); }
  function splitSkills(str){
    return (str || "").split(",").map(s => sanitize(s)).filter(Boolean);
  }
  function escapeHtml(str){
    return (str || "").toString()
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  // ------- Bind simple fields -------
  function initFields(){
    $("#fullName").value = state.contact.fullName || "";
    $("#title").value    = state.contact.title    || "";
    $("#email").value    = state.contact.email    || "";
    $("#phone").value    = state.contact.phone    || "";
    $("#location").value = state.contact.location || "";
    $("#link1").value    = (state.contact.links?.[0]?.url) || "";
    $("#summary").value  = state.summary || "";
    $("#skills").value   = state.skills.join(", ");

    $("#fullName").addEventListener("input", e => { state.contact.fullName = e.target.value; update(); });
    $("#title").addEventListener("input",    e => { state.contact.title    = e.target.value; update(); });
    $("#email").addEventListener("input",    e => { state.contact.email    = e.target.value; update(); });
    $("#phone").addEventListener("input",    e => { state.contact.phone    = e.target.value; update(); });
    $("#location").addEventListener("input", e => { state.contact.location = e.target.value; update(); });
    $("#link1").addEventListener("input",    e => { state.contact.links = [{label:"", url:e.target.value}]; update(); });
    $("#summary").addEventListener("input",  e => { state.summary = e.target.value; update(); });
    $("#skills").addEventListener("input",   e => { state.skills  = splitSkills(e.target.value); update(); });
  }

  // ------- Helpers for repeatable lists -------
  function makeBulletInputs(arr, onChange){
    const wrap = document.createElement("div");
    wrap.className = "items";
    (arr||[]).forEach((val, idx) => {
      const line = document.createElement("div");
      line.className = "row-1";
      line.innerHTML = `
        <div>
          <label>Bullet ${idx+1}</label>
          <input type="text" value="${val || ""}">
        </div>`;
      const input = line.querySelector("input");
      input.addEventListener("input", e => onChange({ type:"edit", index: idx, value: e.target.value }));
      wrap.appendChild(line);
    });
    const buttons = document.createElement("div");
    buttons.className = "btns";
    const add = document.createElement("button");
    add.className = "quiet"; add.textContent = "+ Add Bullet";
    add.addEventListener("click", () => onChange({ type:"add" }));
    buttons.appendChild(add);
    if(arr?.length){
      const del = document.createElement("button");
      del.className = "danger"; del.textContent = "Remove last";
      del.addEventListener("click", () => onChange({ type:"remove-last" }));
      buttons.appendChild(del);
    }
    wrap.appendChild(buttons);
    return wrap;
  }

  function move(arr, from, to){
    if(to < 0 || to >= arr.length) return;
    const [it] = arr.splice(from,1);
    arr.splice(to,0,it);
  }

  // ------- Render Experience -------
  function renderExperience(){
    const host = $("#expList"); host.innerHTML = "";
    state.experience.forEach((exp, i) => {
      const node = document.createElement("div");
      node.className = "item";
      node.innerHTML = `
        <div class="row">
          <div>
            <label>Role</label>
            <input type="text" value="${exp.role || ""}">
          </div>
          <div>
            <label>Company</label>
            <input type="text" value="${exp.company || ""}">
          </div>
        </div>
        <div class="row">
          <div>
            <label>Location</label>
            <input type="text" value="${exp.location || ""}">
          </div>
          <div class="row">
            <div>
              <label>Start</label>
              <input type="text" value="${exp.start || ""}">
            </div>
            <div>
              <label>End (or “Present”)</label>
              <input type="text" value="${exp.end || ""}">
            </div>
          </div>
        </div>
      `;
      const inputs = node.querySelectorAll("input");
      inputs[0].addEventListener("input", e => { exp.role = e.target.value; update(); });
      inputs[1].addEventListener("input", e => { exp.company = e.target.value; update(); });
      inputs[2].addEventListener("input", e => { exp.location = e.target.value; update(); });
      inputs[3].addEventListener("input", e => { exp.start = e.target.value; update(); });
      inputs[4].addEventListener("input", e => { exp.end   = e.target.value; update(); });

      const bulletsWrap = makeBulletInputs(exp.bullets || [], (evt) => {
        if(evt.type === "edit"){
          exp.bullets[evt.index] = evt.value;
          update();
        } else if (evt.type === "add"){
          (exp.bullets ||= []).push("");
          update(); renderExperience();
        } else if (evt.type === "remove-last"){
          exp.bullets.pop();
          update(); renderExperience();
        }
      });
      node.appendChild(bulletsWrap);

      const actions = document.createElement("div");
      actions.className = "item-actions";
      actions.innerHTML = `
        <button class="quiet">▲</button>
        <button class="quiet">▼</button>
        <button class="danger">Delete</button>`;
      const [up, down, del] = actions.querySelectorAll("button");
      up.addEventListener("click", () => { move(state.experience, i, i-1); update(); renderExperience(); });
      down.addEventListener("click", () => { move(state.experience, i, i+1); update(); renderExperience(); });
      del.addEventListener("click", () => { state.experience.splice(i,1); update(); renderExperience(); });
      node.appendChild(actions);

      host.appendChild(node);
    });
  }

  // ------- Render Education -------
  function renderEducation(){
    const host = $("#eduList"); host.innerHTML = "";
    state.education.forEach((edu, i) => {
      const node = document.createElement("div");
      node.className = "item";
      node.innerHTML = `
        <div class="row">
          <div>
            <label>Degree</label>
            <input type="text" value="${edu.degree || ""}">
          </div>
          <div>
            <label>School</label>
            <input type="text" value="${edu.school || ""}">
          </div>
        </div>
        <div class="row">
          <div>
            <label>Location</label>
            <input type="text" value="${edu.location || ""}">
          </div>
          <div>
            <label>Year (e.g., 2024)</label>
            <input type="text" value="${edu.year || ""}">
          </div>
        </div>
      `;
      const inputs = node.querySelectorAll("input");
      inputs[0].addEventListener("input", e => { edu.degree  = e.target.value; update(); });
      inputs[1].addEventListener("input", e => { edu.school  = e.target.value; update(); });
      inputs[2].addEventListener("input", e => { edu.location= e.target.value; update(); });
      inputs[3].addEventListener("input", e => { edu.year    = e.target.value; update(); });

      const detailsWrap = makeBulletInputs(edu.details || [], (evt) => {
        if(evt.type === "edit"){
          (edu.details ||= [])[evt.index] = evt.value;
          update();
        } else if (evt.type === "add"){
          (edu.details ||= []).push("");
          update(); renderEducation();
        } else if (evt.type === "remove-last"){
          edu.details.pop();
          update(); renderEducation();
        }
      });
      node.appendChild(detailsWrap);

      const actions = document.createElement("div");
      actions.className = "item-actions";
      actions.innerHTML = `
        <button class="quiet">▲</button>
        <button class="quiet">▼</button>
        <button class="danger">Delete</button>`;
      const [up, down, del] = actions.querySelectorAll("button");
      up.addEventListener("click", () => { move(state.education, i, i-1); update(); renderEducation(); });
      down.addEventListener("click", () => { move(state.education, i, i+1); update(); renderEducation(); });
      del.addEventListener("click", () => { state.education.splice(i,1); update(); renderEducation(); });
      node.appendChild(actions);

      host.appendChild(node);
    });
  }

  // ------- Render Projects -------
  function renderProjects(){
    const host = $("#projList"); host.innerHTML = "";
    state.projects.forEach((p, i) => {
      const node = document.createElement("div");
      node.className = "item";
      node.innerHTML = `
        <div class="row">
          <div>
            <label>Name</label>
            <input type="text" value="${p.name || ""}">
          </div>
          <div>
            <label>Link (URL)</label>
            <input type="url" value="${p.link || ""}">
          </div>
        </div>
        <div class="row-1">
          <div>
            <label>One-line summary</label>
            <input type="text" value="${p.summary || ""}">
          </div>
        </div>
      `;
      const inputs = node.querySelectorAll("input");
      inputs[0].addEventListener("input", e => { p.name    = e.target.value; update(); });
      inputs[1].addEventListener("input", e => { p.link    = e.target.value; update(); });
      inputs[2].addEventListener("input", e => { p.summary = e.target.value; update(); });

      const bulletsWrap = makeBulletInputs(p.bullets || [], (evt) => {
        if(evt.type === "edit"){
          (p.bullets ||= [])[evt.index] = evt.value;
          update();
        } else if (evt.type === "add"){
          (p.bullets ||= []).push("");
          update(); renderProjects();
        } else if (evt.type === "remove-last"){
          p.bullets.pop();
          update(); renderProjects();
        }
      });
      node.appendChild(bulletsWrap);

      const actions = document.createElement("div");
      actions.className = "item-actions";
      actions.innerHTML = `
        <button class="quiet">▲</button>
        <button class="quiet">▼</button>
        <button class="danger">Delete</button>`;
      const [up, down, del] = actions.querySelectorAll("button");
      up.addEventListener("click", () => { move(state.projects, i, i-1); update(); renderProjects(); });
      down.addEventListener("click", () => { move(state.projects, i, i+1); update(); renderProjects(); });
      del.addEventListener("click", () => { state.projects.splice(i,1); update(); renderProjects(); });
      node.appendChild(actions);

      host.appendChild(node);
    });
  }

  // ------- Build resume HTML (single flow of sections) -------
  function buildResumeHtml(){
    const c = state.contact || {};
    const link = (c.links && c.links[0] && c.links[0].url)
      ? `<span> • <a href="${escapeHtml(c.links[0].url)}">${escapeHtml(c.links[0].url)}</a></span>` : "";

    const summary = sanitize(state.summary);
    const skills  = state.skills || [];
    const exp = state.experience || [];
    const edu = state.education || [];
    const pro = state.projects || [];

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="r-header">
        <div class="r-name">${escapeHtml(c.fullName || "")}</div>
        <div class="r-title">${escapeHtml(c.title || "")}</div>
        <div class="r-contact">
          ${escapeHtml(c.email || "") ? `<span>${escapeHtml(c.email)}</span>` : ""}
          ${escapeHtml(c.phone || "") ? `<span> • ${escapeHtml(c.phone)}</span>` : ""}
          ${escapeHtml(c.location || "") ? `<span> • ${escapeHtml(c.location)}</span>` : ""}
          ${link}
        </div>
      </div>

      ${summary ? `
        <div class="r-section">
          <h3>Summary</h3>
          <div>${escapeHtml(summary)}</div>
        </div>` : ""}

      ${skills.length ? `
        <div class="r-section">
          <h3>Skills</h3>
          <div>${skills.map(s=>escapeHtml(s)).join(" · ")}</div>
        </div>` : ""}

      ${exp.length ? `
        <div class="r-section">
          <h3>Experience</h3>
          ${exp.map(e => `
            <div class="r-item">
              <div class="r-role">${escapeHtml(e.role || "")} — ${escapeHtml(e.company || "")}</div>
              <div class="r-meta">${escapeHtml(e.location || "")}${(e.location && (e.start||e.end)) ? " • " : ""}${escapeHtml((e.start||"") + (e.end? " – " + e.end : ""))}</div>
              ${Array.isArray(e.bullets) && e.bullets.length ? `
                <ul class="r-bullets">
                  ${e.bullets.filter(Boolean).map(b=>`<li>${escapeHtml(b)}</li>`).join("")}
                </ul>` : ""}
            </div>
          `).join("")}
        </div>` : ""}

      ${edu.length ? `
        <div class="r-section">
          <h3>Education</h3>
          ${edu.map(ed => `
            <div class="r-item">
              <div class="r-role">${escapeHtml(ed.degree || "")} — ${escapeHtml(ed.school || "")}</div>
              <div class="r-meta">${escapeHtml(ed.location || "")}${(ed.location && ed.year) ? " • " : ""}${escapeHtml(ed.year || "")}</div>
              ${Array.isArray(ed.details) && ed.details.length ? `
                <ul class="r-bullets">
                  ${ed.details.filter(Boolean).map(b=>`<li>${escapeHtml(b)}</li>`).join("")}
                </ul>` : ""}
            </div>
          `).join("")}
        </div>` : ""}

      ${pro.length ? `
        <div class="r-section">
          <h3>Projects</h3>
          ${pro.map(p => `
            <div class="r-item">
              <div class="r-role">${escapeHtml(p.name || "")}${p.link ? ` — <a href="${escapeHtml(p.link)}">${escapeHtml(p.link)}</a>` : ""}</div>
              ${p.summary ? `<div>${escapeHtml(p.summary)}</div>` : ""}
              ${Array.isArray(p.bullets) && p.bullets.length ? `
                <ul class="r-bullets">
                  ${p.bullets.filter(Boolean).map(b=>`<li>${escapeHtml(b)}</li>`).join("")}
                </ul>` : ""}
            </div>
          `).join("")}
        </div>` : ""}
    `;
    return wrap;
  }

  // ------- Pagination helpers -------
  function makeEmptyPage(){
    const page = document.createElement("div");
    page.className = "page";
    const inner = document.createElement("div");
    inner.className = "page-inner";
    page.appendChild(inner);
    return page;
  }

  // ------- Preview pagination with header+first-item lock -------
  function paginateIntoPages(){
    const stack = $("#pageStack");
    stack.innerHTML = "";

    // counter UI inside the preview panel
    const panel = document.querySelector(".preview-panel");
    let counter = panel.querySelector(".preview-counter");
    if(!counter){
      counter = document.createElement("div");
      counter.className = "preview-counter";
      panel.prepend(counter);
    }

    let currentPage = makeEmptyPage();
    stack.appendChild(currentPage);
    let pageInner = currentPage.querySelector(".page-inner");

    const content = buildResumeHtml();
    const blocks = Array.from(content.children); // header + each .r-section

    // helper to test-fit a fragment; reverts if it doesn't fit
    function tryAppend(fragment){
      pageInner.appendChild(fragment);
      const fits = pageInner.scrollHeight <= pageInner.clientHeight;
      if(!fits){
        pageInner.removeChild(fragment);
      }
      return fits;
    }

    // place non-section (top header) normally
    if(blocks.length && !blocks[0].classList.contains("r-section")){
      const header = blocks[0].cloneNode(true);
      if(!tryAppend(header)){
        currentPage = makeEmptyPage();
        stack.appendChild(currentPage);
        pageInner = currentPage.querySelector(".page-inner");
        pageInner.appendChild(header);
      }
      blocks.shift();
    }

    // stream sections with keep-with-next (title + first child)
    blocks.forEach(sec => {
      if(!sec.classList.contains("r-section")){
        // just in case there are any stray blocks
        const node = sec.cloneNode(true);
        if(!tryAppend(node)){
          currentPage = makeEmptyPage();
          stack.appendChild(currentPage);
          pageInner = currentPage.querySelector(".page-inner");
          pageInner.appendChild(node);
        }
        return;
      }

      const title = sec.querySelector(":scope > h3");
      const bodyKids = Array.from(sec.children).filter(el => el !== title);

      // Build a fresh shell with title
      let shell = sec.cloneNode(false);
      if(title) shell.appendChild(title.cloneNode(true));

      // If there is a first child, build a fragment containing title + first child as a unit
      if(bodyKids.length){
        const first = bodyKids[0].cloneNode(true);
        const pair = sec.cloneNode(false);
        if(title) pair.appendChild(title.cloneNode(true));
        pair.appendChild(first);

        // Try to place header+first together; if it doesn't fit, start a new page then place them
        if(!tryAppend(pair)){
          currentPage = makeEmptyPage();
          stack.appendChild(currentPage);
          pageInner = currentPage.querySelector(".page-inner");
          pageInner.appendChild(pair);
        }

        // Now continue the section on the current page. The "pair" we added already includes a title,
        // so for subsequent pages we will repeat the title as needed.
        shell = pair; // continue appending into this shell
      } else {
        // Section with no children: place just the shell+title
        if(!tryAppend(shell)){
          currentPage = makeEmptyPage();
          stack.appendChild(currentPage);
          pageInner = currentPage.querySelector(".page-inner");
          pageInner.appendChild(shell);
        }
      }

      // Add remaining children, repeating the title when we spill
      for(let i=1; i<bodyKids.length; i++){
        const node = bodyKids[i].cloneNode(true);
        shell.appendChild(node);
        if(pageInner.scrollHeight > pageInner.clientHeight){
          // remove the node and start a new page with a fresh shell + repeated title
          shell.removeChild(node);

          currentPage = makeEmptyPage();
          stack.appendChild(currentPage);
          pageInner = currentPage.querySelector(".page-inner");

          shell = sec.cloneNode(false);
          if(title) shell.appendChild(title.cloneNode(true));
          pageInner.appendChild(shell);

          shell.appendChild(node);
        }
      }
    });

    // update page counter UI
    const pages = Array.from(stack.querySelectorAll(".page"));
    const total = pages.length;
    counter.textContent = total > 1 ? `${total} pages` : `1 page`;

    scalePagesToFit();
  }

  // ------- Scale page previews to panel width -------
  function scalePagesToFit(){
    const panel = $(".preview-panel");
    const pages = $$(".page");
    if(!pages.length) return;

    pages.forEach(p => p.style.transform = "none");

    const naturalWidth = pages[0].getBoundingClientRect().width;
    const panelWidth   = panel.clientWidth || panel.getBoundingClientRect().width;

    const target = Math.min(panelWidth - 8, naturalWidth);
    const scale  = Math.max(0.5, Math.min(1, target / naturalWidth));

    pages.forEach(p => { p.style.transform = `scale(${scale})`; });

    const stack = $("#pageStack");
    stack.style.gap = scale < 0.8 ? "12px" : "16px";
  }

// ------- Update & boot with scroll restore -------
function update(){
  autosave();
  const panel = document.querySelector(".preview-panel");
  const prevScroll = panel.scrollTop;   // remember scroll

  paginateIntoPages();

  // restore scroll after rebuild
  panel.scrollTop = prevScroll;
}

  function boot(){
    initFields();
    renderExperience();
    renderEducation();
    renderProjects();
    paginateIntoPages();
  }
  boot();

  // Add / Remove items
  $("#addExp").addEventListener("click", () => {
    state.experience.push({ role:"", company:"", location:"", start:"", end:"", bullets:[] });
    update(); renderExperience();
  });
  $("#addEdu").addEventListener("click", () => {
    state.education.push({ degree:"", school:"", location:"", year:"", details:[] });
    update(); renderEducation();
  });
  $("#addProj").addEventListener("click", () => {
    state.projects.push({ name:"", link:"", summary:"", bullets:[] });
    update(); renderProjects();
  });

  // Export / Import / Reset / Print
  $("#btnExport").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "resume-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#fileImport").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        state = Object.assign({}, emptyState, data);
        save();
        boot();
      }catch(err){
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  $("#btnReset").addEventListener("click", () => {
    if(confirm("This will erase all your resume data on this browser. Continue?")){
      state = JSON.parse(JSON.stringify(emptyState));
      save();
      boot();
    }
  });

  $("#btnPrint").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    window.print();
  });

  // Resize: rescale preview pages
  window.addEventListener("resize", scalePagesToFit);
  setTimeout(scalePagesToFit, 50);

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"){
      e.preventDefault(); save();
    }
  });

  /* ========= ADD-ON: Optional Sections (Licenses, Certifications, Awards, Research, Others, References) ========= */

  /* 1) Ensure default keys exist in state (non-breaking) */
  const __ADDON_DEFAULTS__ = {
    licenses: [],
    certifications: [],
    awards: [],
    research: [],
    others: { sectionTitle: "Others", items: [] },
    references: []
  };
  Object.entries(__ADDON_DEFAULTS__).forEach(([k, v]) => {
    if (state[k] === undefined) state[k] = JSON.parse(JSON.stringify(v));
  });

  /* 2) Small helpers */
  function ensureArray(obj, key){ if(!Array.isArray(obj[key])) obj[key] = []; }
  function textInputRow(labelTxt, value, onInput, type="text"){
    const wrap = document.createElement("div");
    wrap.className = "row-1";
    wrap.innerHTML = `
      <div>
        <label>${labelTxt}</label>
        <input type="${type}" value="${value || ""}">
      </div>`;
    const input = wrap.querySelector("input");
    input.addEventListener("input", e => onInput(e.target.value));
    return wrap;
  }
  function twoColRow(pairs){
    const wrap = document.createElement("div");
    wrap.className = "row";
    pairs.forEach(p => {
      const cell = document.createElement("div");
      cell.innerHTML = `
        <label>${p.label}</label>
        <input type="${p.type || "text"}" value="${p.value || ""}">
      `;
      const input = cell.querySelector("input");
      input.addEventListener("input", e => p.onInput(e.target.value));
      wrap.appendChild(cell);
    });
    return wrap;
  }
  function actionsBar(arr, idx, rerender){
    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.innerHTML = `
      <button class="quiet">▲</button>
      <button class="quiet">▼</button>
      <button class="danger">Delete</button>`;
    const [up, down, del] = actions.querySelectorAll("button");
    up.addEventListener("click",   () => { move(arr, idx, idx-1); update(); rerender(); });
    down.addEventListener("click", () => { move(arr, idx, idx+1); update(); rerender(); });
    del.addEventListener("click",  () => { arr.splice(idx,1); update(); rerender(); });
    return actions;
  }

  /* 3) RENDERERS */

  function renderLicenses(){
    ensureArray(state, "licenses");
    const host = document.getElementById("licList");
    if(!host) return;
    host.innerHTML = "";
    state.licenses.forEach((it, i) => {
      const node = document.createElement("div");
      node.className = "item";

      node.appendChild(twoColRow([
        { label: "Name/Title", value: it.name, onInput: v => { it.name=v; update(); } },
        { label: "Issuing Authority", value: it.issuer, onInput: v => { it.issuer=v; update(); } },
      ]));
      node.appendChild(twoColRow([
        { label: "Issued (e.g., Jun 2024)", value: it.issued, onInput: v => { it.issued=v; update(); } },
        { label: "Expires (optional)", value: it.expires, onInput: v => { it.expires=v; update(); } },
      ]));
      node.appendChild(twoColRow([
        { label: "Credential ID (optional)", value: it.credId, onInput: v => { it.credId=v; update(); } },
        { label: "Credential URL (optional)", value: it.credUrl, onInput: v => { it.credUrl=v; update(); }, type:"url" },
      ]));
      node.appendChild(textInputRow("Location (optional)", it.location, v => { it.location=v; update(); }));

      const bullets = makeBulletInputs(it.bullets || [], evt => {
        (it.bullets ||= []);
        if(evt.type==="edit"){ it.bullets[evt.index]=evt.value; update(); }
        if(evt.type==="add"){ it.bullets.push(""); update(); renderLicenses(); }
        if(evt.type==="remove-last"){ it.bullets.pop(); update(); renderLicenses(); }
      });
      node.appendChild(bullets);

      node.appendChild(actionsBar(state.licenses, i, renderLicenses));
      host.appendChild(node);
    });
  }

  function renderCertifications(){
    ensureArray(state, "certifications");
    const host = document.getElementById("certList");
    if(!host) return;
    host.innerHTML = "";
    state.certifications.forEach((it, i) => {
      const node = document.createElement("div");
      node.className = "item";

      node.appendChild(twoColRow([
        { label: "Name/Title", value: it.name, onInput: v => { it.name=v; update(); } },
        { label: "Issuing Authority", value: it.issuer, onInput: v => { it.issuer=v; update(); } },
      ]));
      node.appendChild(twoColRow([
        { label: "Issued (e.g., Jun 2024)", value: it.issued, onInput: v => { it.issued=v; update(); } },
        { label: "Expires (optional)", value: it.expires, onInput: v => { it.expires=v; update(); } },
      ]));
      node.appendChild(twoColRow([
        { label: "Credential ID (optional)", value: it.credId, onInput: v => { it.credId=v; update(); } },
        { label: "Credential URL (optional)", value: it.credUrl, onInput: v => { it.credUrl=v; update(); }, type:"url" },
      ]));
      node.appendChild(textInputRow("Location (optional)", it.location, v => { it.location=v; update(); }));

      const bullets = makeBulletInputs(it.bullets || [], evt => {
        (it.bullets ||= []);
        if(evt.type==="edit"){ it.bullets[evt.index]=evt.value; update(); }
        if(evt.type==="add"){ it.bullets.push(""); update(); renderCertifications(); }
        if(evt.type==="remove-last"){ it.bullets.pop(); update(); renderCertifications(); }
      });
      node.appendChild(bullets);

      node.appendChild(actionsBar(state.certifications, i, renderCertifications));
      host.appendChild(node);
    });
  }

  function renderAwards(){
    ensureArray(state, "awards");
    const host = document.getElementById("awardList");
    if(!host) return;
    host.innerHTML = "";
    state.awards.forEach((it, i) => {
      const node = document.createElement("div");
      node.className = "item";

      node.appendChild(twoColRow([
        { label: "Title", value: it.title, onInput: v => { it.title=v; update(); } },
        { label: "Issuer/Organizer", value: it.issuer, onInput: v => { it.issuer=v; update(); } },
      ]));
      node.appendChild(twoColRow([
        { label: "Date", value: it.date, onInput: v => { it.date=v; update(); } },
        { label: "Scope (e.g., Company, National)", value: it.scope, onInput: v => { it.scope=v; update(); } },
      ]));
      node.appendChild(textInputRow("Location (optional)", it.location, v => { it.location=v; update(); }));
      node.appendChild(textInputRow("One-line description (optional)", it.summary, v => { it.summary=v; update(); }));

      const bullets = makeBulletInputs(it.bullets || [], evt => {
        (it.bullets ||= []);
        if(evt.type==="edit"){ it.bullets[evt.index]=evt.value; update(); }
        if(evt.type==="add"){ it.bullets.push(""); update(); renderAwards(); }
        if(evt.type==="remove-last"){ it.bullets.pop(); update(); renderAwards(); }
      });
      node.appendChild(bullets);

      node.appendChild(actionsBar(state.awards, i, renderAwards));
      host.appendChild(node);
    });
  }

  function renderResearch(){
    ensureArray(state, "research");
    const host = document.getElementById("resList");
    if(!host) return;
    host.innerHTML = "";
    state.research.forEach((it, i) => {
      const node = document.createElement("div");
      node.className = "item";

      node.appendChild(twoColRow([
        { label: "Title", value: it.title, onInput: v => { it.title=v; update(); } },
        { label: "Venue (Journal/Conference/Repository)", value: it.venue, onInput: v => { it.venue=v; update(); } },
      ]));
      node.appendChild(twoColRow([
        { label: "Publication Date", value: it.pubDate, onInput: v => { it.pubDate=v; update(); } },
        { label: "DOI / URL (optional)", value: it.url, onInput: v => { it.url=v; update(); }, type:"url" },
      ]));
      node.appendChild(textInputRow("Co-authors (comma-separated)", it.authors, v => { it.authors=v; update(); }));
      node.appendChild(textInputRow("One-line summary (optional)", it.summary, v => { it.summary=v; update(); }));

      const bullets = makeBulletInputs(it.bullets || [], evt => {
        (it.bullets ||= []);
        if(evt.type==="edit"){ it.bullets[evt.index]=evt.value; update(); }
        if(evt.type==="add"){ it.bullets.push(""); update(); renderResearch(); }
        if(evt.type==="remove-last"){ it.bullets.pop(); update(); renderResearch(); }
      });
      node.appendChild(bullets);

      node.appendChild(actionsBar(state.research, i, renderResearch));
      host.appendChild(node);
    });
  }

  function renderOthers(){
    if(!state.others || typeof state.others !== "object"){
      state.others = { sectionTitle: "Others", items: [] };
    }
    const titleEl = document.getElementById("otherTitle");
    if(titleEl){
      titleEl.value = state.others.sectionTitle || "Others";
      titleEl.addEventListener("input", e => {
        state.others.sectionTitle = e.target.value || "Others";
        update();
      }, { once: true });
    }

    const host = document.getElementById("otherList");
    if(!host) return;
    host.innerHTML = "";
    ensureArray(state.others, "items");

    state.others.items.forEach((it, i) => {
      const node = document.createElement("div");
      node.className = "item";

      node.appendChild(twoColRow([
        { label: "Heading", value: it.heading, onInput: v => { it.heading=v; update(); } },
        { label: "Subheading", value: it.subheading, onInput: v => { it.subheading=v; update(); } },
      ]));
      node.appendChild(twoColRow([
        { label: "Meta (date/location/tags)", value: it.meta, onInput: v => { it.meta=v; update(); } },
        { label: "Link (optional)", value: it.link, onInput: v => { it.link=v; update(); }, type:"url" },
      ]));

      const bullets = makeBulletInputs(it.bullets || [], evt => {
        (it.bullets ||= []);
        if(evt.type==="edit"){ it.bullets[evt.index]=evt.value; update(); }
        if(evt.type==="add"){ it.bullets.push(""); update(); renderOthers(); }
        if(evt.type==="remove-last"){ it.bullets.pop(); update(); renderOthers(); }
      });
      node.appendChild(bullets);

      node.appendChild(actionsBar(state.others.items, i, renderOthers));
      host.appendChild(node);
    });
  }

  function renderReferences(){
    ensureArray(state, "references");
    const host = document.getElementById("refList");
    if(!host) return;
    host.innerHTML = "";
    state.references.forEach((it, i) => {
      const node = document.createElement("div");
      node.className = "item";

      node.appendChild(twoColRow([
        { label: "Name", value: it.name, onInput: v => { it.name=v; update(); } },
        { label: "Title/Role", value: it.role, onInput: v => { it.role=v; update(); } },
      ]));
      node.appendChild(twoColRow([
        { label: "Company/Organization", value: it.company, onInput: v => { it.company=v; update(); } },
        { label: "Relationship (optional)", value: it.rel, onInput: v => { it.rel=v; update(); } },
      ]));
      node.appendChild(twoColRow([
        { label: "Email (optional)", value: it.email, onInput: v => { it.email=v; update(); }, type:"email" },
        { label: "Phone (optional)", value: it.phone, onInput: v => { it.phone=v; update(); }, type:"tel" },
      ]));
      node.appendChild(textInputRow("URL (LinkedIn/Website) (optional)", it.url, v => { it.url=v; update(); }, "url"));
      node.appendChild(textInputRow("Note (e.g., Available upon request)", it.note, v => { it.note=v; update(); }));

      const bullets = makeBulletInputs(it.bullets || [], evt => {
        (it.bullets ||= []);
        if(evt.type==="edit"){ it.bullets[evt.index]=evt.value; update(); }
        if(evt.type==="add"){ it.bullets.push(""); update(); renderReferences(); }
        if(evt.type==="remove-last"){ it.bullets.pop(); update(); renderReferences(); }
      });
      node.appendChild(bullets);

      node.appendChild(actionsBar(state.references, i, renderReferences));
      host.appendChild(node);
    });
  }

  /* 4) Wire the “Add …” buttons */
  function wireOptionalButtons(){
    const addLic   = document.getElementById("addLic");
    const addCert  = document.getElementById("addCert");
    const addAward = document.getElementById("addAward");
    const addRes   = document.getElementById("addRes");
    const addOther = document.getElementById("addOther");
    const addRef   = document.getElementById("addRef");

    if(addLic) addLic.addEventListener("click", () => {
      state.licenses.push({ name:"", issuer:"", issued:"", expires:"", credId:"", credUrl:"", location:"", bullets:[] });
      update(); renderLicenses();
    });
    if(addCert) addCert.addEventListener("click", () => {
      state.certifications.push({ name:"", issuer:"", issued:"", expires:"", credId:"", credUrl:"", location:"", bullets:[] });
      update(); renderCertifications();
    });
    if(addAward) addAward.addEventListener("click", () => {
      state.awards.push({ title:"", issuer:"", date:"", scope:"", location:"", summary:"", bullets:[] });
      update(); renderAwards();
    });
    if(addRes) addRes.addEventListener("click", () => {
      state.research.push({ title:"", venue:"", pubDate:"", url:"", authors:"", summary:"", bullets:[] });
      update(); renderResearch();
    });
    if(addOther) addOther.addEventListener("click", () => {
      (state.others ||= {sectionTitle:"Others", items:[]});
      ensureArray(state.others, "items");
      state.others.items.push({ heading:"", subheading:"", meta:"", link:"", bullets:[] });
      update(); renderOthers();
    });
    if(addRef) addRef.addEventListener("click", () => {
      state.references.push({ name:"", role:"", company:"", rel:"", email:"", phone:"", url:"", note:"", bullets:[] });
      update(); renderReferences();
    });
  }

  /* 5) Extend the preview by wrapping original buildResumeHtml() */
  const __orig_buildResumeHtml = buildResumeHtml;
  buildResumeHtml = function(){
    const wrap = __orig_buildResumeHtml();

    function esc(s){ return escapeHtml(s || ""); }
    function makeSection(title){
      const sec = document.createElement("div");
      sec.className = "r-section";
      const h = document.createElement("h3");
      h.textContent = title;
      sec.appendChild(h);
      return sec;
    }
    function appendItem(sec, roleHtml, metaHtml, summaryHtml, bulletsArr){
      const item = document.createElement("div");
      item.className = "r-item";
      if(roleHtml){
        const role = document.createElement("div");
        role.className = "r-role";
        role.innerHTML = roleHtml;
        item.appendChild(role);
      }
      if(metaHtml){
        const meta = document.createElement("div");
        meta.className = "r-meta";
        meta.innerHTML = metaHtml;
        item.appendChild(meta);
      }
      if(summaryHtml){
        const p = document.createElement("div");
        p.innerHTML = summaryHtml;
        item.appendChild(p);
      }
      if(Array.isArray(bulletsArr) && bulletsArr.filter(Boolean).length){
        const ul = document.createElement("ul");
        ul.className = "r-bullets";
        bulletsArr.filter(Boolean).forEach(b => {
          const li = document.createElement("li");
          li.textContent = b;
          ul.appendChild(li);
        });
        item.appendChild(ul);
      }
      sec.appendChild(item);
    }

    /* Licenses */
    if(Array.isArray(state.licenses) && state.licenses.length){
      const sec = makeSection("Licenses");
      state.licenses.forEach(l => {
        const role = `${esc(l.name)} — ${esc(l.issuer)}`;
        const meta = [esc(l.issued), esc(l.expires)].filter(Boolean).join(" – ")
                     + ((l.location && (l.issued || l.expires)) ? " • " : "")
                     + esc(l.location || "");
        const creds = [l.credId ? `ID: ${esc(l.credId)}` : "", l.credUrl ? `<a href="${esc(l.credUrl)}">${esc(l.credUrl)}</a>` : ""]
                      .filter(Boolean).join(" • ");
        appendItem(sec, role, meta, creds || "", l.bullets);
      });
      wrap.appendChild(sec);
    }

    /* Certifications */
    if(Array.isArray(state.certifications) && state.certifications.length){
      const sec = makeSection("Certifications");
      state.certifications.forEach(c => {
        const role = `${esc(c.name)} — ${esc(c.issuer)}`;
        const meta = [esc(c.issued), esc(c.expires)].filter(Boolean).join(" – ")
                     + ((c.location && (c.issued || c.expires)) ? " • " : "")
                     + esc(c.location || "");
        const creds = [c.credId ? `ID: ${esc(c.credId)}` : "", c.credUrl ? `<a href="${esc(c.credUrl)}">${esc(c.credUrl)}</a>` : ""]
                      .filter(Boolean).join(" • ");
        appendItem(sec, role, meta, creds || "", c.bullets);
      });
      wrap.appendChild(sec);
    }

    /* Awards */
    if(Array.isArray(state.awards) && state.awards.length){
      const sec = makeSection("Awards");
      state.awards.forEach(a => {
        const role = `${esc(a.title)} — ${esc(a.issuer)}`;
        const meta = [esc(a.date), esc(a.scope), esc(a.location)].filter(Boolean).join(" • ");
        appendItem(sec, role, meta, esc(a.summary || ""), a.bullets);
      });
      wrap.appendChild(sec);
    }

    /* Published Research */
    if(Array.isArray(state.research) && state.research.length){
      const sec = makeSection("Published Research");
      state.research.forEach(r => {
        const role = `${esc(r.title)} — ${esc(r.venue)}`;
        const meta = [esc(r.pubDate), r.url ? `<a href="${esc(r.url)}">${esc(r.url)}</a>` : "", esc(r.authors)]
                      .filter(Boolean).join(" • ");
        appendItem(sec, role, meta, esc(r.summary || ""), r.bullets);
      });
      wrap.appendChild(sec);
    }

    /* Others (renameable) */
    if(state.others && Array.isArray(state.others.items) && state.others.items.length){
      const title = state.others.sectionTitle || "Others";
      const sec = makeSection(title);
      state.others.items.forEach(o => {
        const role = `${esc(o.heading || "")}${o.subheading ? " — " + esc(o.subheading) : ""}`;
        const meta = [esc(o.meta || ""), o.link ? `<a href="${esc(o.link)}">${esc(o.link)}</a>` : ""].filter(Boolean).join(" • ");
        appendItem(sec, role, meta, "", o.bullets);
      });
      wrap.appendChild(sec);
    }

    /* References */
    if(Array.isArray(state.references) && state.references.length){
      const sec = makeSection("References");
      state.references.forEach(rf => {
        const role = `${esc(rf.name)} — ${esc(rf.role)}`;
        const metaParts = [
          esc(rf.company || ""),
          esc(rf.rel || ""),
          esc(rf.email || ""),
          esc(rf.phone || ""),
          rf.url ? `<a href="${esc(rf.url)}">${esc(rf.url)}</a>` : ""
        ].filter(Boolean);
        const meta = metaParts.join(" • ");
        appendItem(sec, role, meta, esc(rf.note || ""), rf.bullets);
      });
      wrap.appendChild(sec);
    }

    return wrap;
  };

  /* 6) Patch boot so imports/reset also render these sections */
  const __orig_boot = boot;
  boot = function(){
    __orig_boot();
    renderLicenses();
    renderCertifications();
    renderAwards();
    renderResearch();
    renderOthers();
    renderReferences();
    wireOptionalButtons();
  };

  /* 7) First-time render/wire in the current session */
  renderLicenses();
  renderCertifications();
  renderAwards();
  renderResearch();
  renderOthers();
  renderReferences();
  wireOptionalButtons();

})();

function update(){
  autosave();
  paginateIntoPages();
  const panel = document.querySelector(".preview-panel");
  if(panel) panel.scrollTop = panel.scrollHeight;
}
