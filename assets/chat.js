/* Top Value Cash Buyers — live chat widget (Sarah, web edition).
   Self-injecting: creates its own styles + DOM, talks to the chat backend.
   NOTE: CHAT_ENDPOINT is the chat backend URL. This is currently an EPHEMERAL
   preview tunnel — swap to the stable production URL (e.g. https://chat.topvaluecashbuyers.com/chat)
   at launch. */
(function () {
  "use strict";
  var CHAT_ENDPOINT = "https://units-supervision-devoted-interesting.trycloudflare.com/chat";
  var GREETING = "Hi, I'm Sarah. Are you thinking about selling a place, or just have a question about how it works?";

  // session id (persist per browser tab)
  var sid = sessionStorage.getItem("tvcb_sid");
  if (!sid) { sid = "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9); sessionStorage.setItem("tvcb_sid", sid); }

  var css = `
  .tvcb-fab{position:fixed;right:20px;bottom:20px;z-index:9998;width:60px;height:60px;border-radius:50%;
    background:linear-gradient(145deg,#e7b765,#c98a2b);border:none;cursor:pointer;box-shadow:0 8px 24px rgba(20,30,48,.28);
    display:flex;align-items:center;justify-content:center;transition:transform .18s ease}
  .tvcb-fab:hover{transform:translateY(-2px) scale(1.04)}
  .tvcb-fab svg{width:28px;height:28px;fill:#16223a}
  .tvcb-panel{position:fixed;right:20px;bottom:20px;z-index:9999;width:374px;max-width:calc(100vw - 32px);height:560px;
    max-height:calc(100vh - 40px);background:#fbf7ef;border-radius:18px;box-shadow:0 24px 60px rgba(20,30,48,.34);
    display:none;flex-direction:column;overflow:hidden;font-family:'Inter Tight',system-ui,-apple-system,sans-serif}
  .tvcb-panel.open{display:flex}
  .tvcb-head{background:#16223a;color:#fff;padding:15px 18px;display:flex;align-items:center;gap:11px}
  .tvcb-head .dot{width:9px;height:9px;border-radius:50%;background:#54d27a;box-shadow:0 0 0 3px rgba(84,210,122,.22)}
  .tvcb-head .t{font-weight:600;font-size:15px;line-height:1.15}
  .tvcb-head .s{font-size:11.5px;opacity:.72;margin-top:1px}
  .tvcb-head .x{margin-left:auto;background:none;border:none;color:#fff;opacity:.7;font-size:22px;cursor:pointer;line-height:1}
  .tvcb-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#fbf7ef}
  .tvcb-msg{max-width:82%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}
  .tvcb-bot{align-self:flex-start;background:#fff;color:#1c2436;border:1px solid #ece3d2;border-bottom-left-radius:5px}
  .tvcb-me{align-self:flex-end;background:#16223a;color:#fff;border-bottom-right-radius:5px}
  .tvcb-typing{align-self:flex-start;color:#8a8470;font-size:13px;padding:4px 6px}
  .tvcb-foot{padding:11px 12px;border-top:1px solid #ece3d2;display:flex;gap:8px;background:#fbf7ef}
  .tvcb-foot input{flex:1;border:1px solid #d9cfba;border-radius:11px;padding:11px 12px;font-size:14px;font-family:inherit;outline:none;background:#fff}
  .tvcb-foot input:focus{border-color:#c98a2b}
  .tvcb-foot button{background:linear-gradient(145deg,#e7b765,#c98a2b);border:none;border-radius:11px;padding:0 16px;cursor:pointer;font-weight:600;color:#16223a}
  .tvcb-foot button:disabled{opacity:.5;cursor:default}
  .tvcb-note{font-size:10.5px;color:#a89f8a;text-align:center;padding:0 0 8px;background:#fbf7ef}
  `;
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var fab = document.createElement("button");
  fab.className = "tvcb-fab"; fab.setAttribute("aria-label", "Chat with us");
  fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.2 1 4.2 2.7 5.7L4 21l4.3-1.6c1.1.3 2.4.5 3.7.5 5.5 0 10-3.8 10-8.4S17.5 3 12 3z"/></svg>';
  document.body.appendChild(fab);

  var panel = document.createElement("div");
  panel.className = "tvcb-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Chat with Sarah");
  panel.innerHTML =
    '<div class="tvcb-head"><span class="dot"></span><div><div class="t">Chat with Sarah</div>'
    + '<div class="s">Top Value Cash Buyers · usually replies in seconds</div></div>'
    + '<button class="x" aria-label="Close chat">&times;</button></div>'
    + '<div class="tvcb-body" id="tvcb-body"></div>'
    + '<div class="tvcb-note">No obligation · we never share your info</div>'
    + '<form class="tvcb-foot"><input id="tvcb-in" type="text" autocomplete="off" placeholder="Type your message..." aria-label="Your message"/>'
    + '<button type="submit" id="tvcb-send">Send</button></form>';
  document.body.appendChild(panel);

  var body = panel.querySelector("#tvcb-body");
  var input = panel.querySelector("#tvcb-in");
  var sendBtn = panel.querySelector("#tvcb-send");
  var started = false;

  function add(text, who) {
    var m = document.createElement("div");
    m.className = "tvcb-msg " + (who === "me" ? "tvcb-me" : "tvcb-bot");
    m.textContent = text; body.appendChild(m); body.scrollTop = body.scrollHeight;
  }
  function typing(on) {
    var ex = body.querySelector(".tvcb-typing");
    if (on && !ex) { var t = document.createElement("div"); t.className = "tvcb-typing"; t.textContent = "Sarah is typing..."; body.appendChild(t); body.scrollTop = body.scrollHeight; }
    if (!on && ex) ex.remove();
  }
  function open() {
    panel.classList.add("open"); fab.style.display = "none";
    if (!started) { started = true; add(GREETING, "bot"); }
    setTimeout(function () { input.focus(); }, 80);
  }
  function close() { panel.classList.remove("open"); fab.style.display = "flex"; }

  fab.addEventListener("click", open);
  panel.querySelector(".x").addEventListener("click", close);

  panel.querySelector(".tvcb-foot").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = input.value.trim(); if (!msg) return;
    add(msg, "me"); input.value = ""; sendBtn.disabled = true; typing(true);
    fetch(CHAT_ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sid, message: msg })
    }).then(function (r) { return r.json(); }).then(function (d) {
      typing(false); sendBtn.disabled = false;
      if (d && d.reply) add(d.reply, "bot");
      else add("Thanks! A team member will follow up with you shortly.", "bot");
      input.focus();
    }).catch(function () {
      typing(false); sendBtn.disabled = false;
      add("Sorry, I had trouble there. Mind sending that again?", "bot");
    });
  });
})();
