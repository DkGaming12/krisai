document.addEventListener("DOMContentLoaded", () => {
  // ========== MOBILE HAMBURGER ==========
  const hamburger = document.getElementById("hamburger");
  const overlay = document.getElementById("mobileOverlay");
  const toggleSidebar = (open) => {
    const willOpen =
      typeof open === "boolean"
        ? open
        : !document.body.classList.contains("sidebar-open");
    document.body.classList.toggle("sidebar-open", willOpen);
  };

  if (hamburger) {
    hamburger.addEventListener("click", () => toggleSidebar());
  }
  if (overlay) {
    overlay.addEventListener("click", () => toggleSidebar(false));
  }
  // Close sidebar when navigating
  document.querySelectorAll(".menu-item").forEach((a) => {
    a.addEventListener("click", () => toggleSidebar(false));
  });

  // ===== AUTH HELPERS & GUARD =====
  const TOKEN_KEY = "KrisAI_TOKEN";
  const getToken = () => {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  };
  const setToken = (t) => {
    try {
      localStorage.setItem(TOKEN_KEY, t || "");
    } catch {}
  };
  const clearToken = () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  };
  const apiFetch = async (url, options = {}) => {
    const headers = Object.assign({}, options.headers || {});
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;

    const response = await fetch(url, Object.assign({}, options, { headers }));

    // Check if token habis
    if (!response.ok) {
      try {
        const errorData = await response.json();
        if (errorData.error === "Saldo token habis") {
          showTokenModal(errorData.tokens || 0);
          throw new Error("Saldo token habis");
        }
      } catch (e) {
        if (e.message === "Saldo token habis") throw e;
      }
    }

    return response;
  };

  // Modal notifikasi token habis
  function showTokenModal(currentTokens) {
    // Remove existing modal if any
    const existingModal = document.getElementById("tokenModal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "tokenModal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(5px);
    `;

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 2px solid #ef4444;
        border-radius: 20px;
        padding: 40px;
        max-width: 450px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(239, 68, 68, 0.3);
      ">
        <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
        <h2 style="color: #ef4444; margin: 0 0 12px; font-size: 24px;">Token Habis!</h2>
        <p style="color: rgba(255,255,255,0.8); margin: 0 0 8px; font-size: 16px;">
          Saldo token Anda: <strong style="color: #fbbf24;">${currentTokens} token</strong>
        </p>
        <p style="color: rgba(255,255,255,0.6); margin: 0 0 24px; font-size: 14px;">
          Silakan top up untuk melanjutkan menggunakan fitur AI
        </p>
        <a href="/topup.html" style="
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 14px 32px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
          transition: all 0.3s ease;
        " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          💰 Top Up Sekarang
        </a>
        <button onclick="document.getElementById('tokenModal').remove()" style="
          display: block;
          width: 100%;
          margin-top: 16px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.6);
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        ">Tutup</button>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // Redirect if not logged in (allow dashboard)
  (function () {
    const publicPages = ["/", "/index.html", "/login.html", "/register.html"];
    const path = window.location.pathname;
    if (!getToken() && !publicPages.includes(path)) {
      window.location.href = "/login.html";
      return;
    }
  })();

  // Inject Logout item
  (function () {
    if (!getToken()) return;
    const menu = document.querySelector(".menu");
    if (menu) {
      // Fetch user profile
      apiFetch("/api/auth/me")
        .then((r) => r.json())
        .then((user) => {
          // Add user profile info if not already there
          if (!document.getElementById("userProfile")) {
            const userDiv = document.createElement("div");
            userDiv.id = "userProfile";
            userDiv.style.cssText =
              "padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.2); margin-bottom: 8px;";

            const nameEl = document.createElement("div");
            nameEl.style.cssText =
              "font-weight: bold; color: #fff; font-size: 14px;";
            nameEl.textContent = user.username;

            const tokenEl = document.createElement("div");
            tokenEl.style.cssText =
              "font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 4px;";
            tokenEl.textContent = `💎 ${user.tokens} tokens`;

            if (user.isOwner) {
              const ownerBadge = document.createElement("div");
              ownerBadge.style.cssText =
                "font-size: 11px; color: #ffd700; margin-top: 4px; font-weight: bold;";
              ownerBadge.textContent = "👑 OWNER";
              userDiv.appendChild(nameEl);
              userDiv.appendChild(tokenEl);
              userDiv.appendChild(ownerBadge);
            } else {
              userDiv.appendChild(nameEl);
              userDiv.appendChild(tokenEl);
            }

            menu.insertBefore(userDiv, menu.firstChild);
          }
        })
        .catch((err) => console.log("Failed to fetch user info:", err));

      // Add logout link
      if (!document.getElementById("logoutLink")) {
        const a = document.createElement("a");
        a.href = "#";
        a.className = "menu-item";
        a.id = "logoutLink";
        a.textContent = "🚪 Logout";
        a.addEventListener("click", (e) => {
          e.preventDefault();
          clearToken();
          window.location.href = "/login.html";
        });
        menu.appendChild(a);
      }
    }
  })();

  // Handle Auth Forms
  (function () {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const credential = document
          .getElementById("loginCredential")
          .value.trim();
        const password = document.getElementById("loginPassword").value.trim();
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential, password }),
        });
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
          window.location.href = "/index.html";
        } else {
          alert(data.error || "Login gagal");
        }
      });
    }
    const regForm = document.getElementById("registerForm");
    if (regForm) {
      regForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("regUsername").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value.trim();
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (data.token) {
          // Jangan auto-login saat register; tampilkan popup sukses + bonus
          if (data.bonusTokens) {
            const modal = document.getElementById("bonusModal");
            if (modal) {
              modal.style.display = "flex";
              const btn = document.getElementById("bonusBtn");
              if (btn) {
                btn.textContent = "Masuk Sekarang";
                btn.onclick = () => {
                  document.getElementById("bonusModal").style.display = "none";
                  window.location.href = "/login.html";
                };
              }
            } else {
              // Fallback jika modal belum load
              alert("Pendaftaran berhasil! Bonus 500 token. Silakan login.");
              window.location.href = "/login.html";
            }
          } else {
            alert("Pendaftaran berhasil! Silakan login.");
            window.location.href = "/login.html";
          }
        } else {
          alert(data.error || "Register gagal");
        }
      });
    }
  })();

  /* =========================
     CHAT (DIKUNCI)
  ========================== */
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatBox = document.getElementById("chatBox");

  if (chatForm && chatInput && chatBox) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = chatInput.value.trim();
      if (!msg) return;

      addChat(msg, "user");
      chatInput.value = "";

      try {
        const res = await apiFetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg }),
        });

        const data = await res.json();
        addChat(data.reply, "ai");
      } catch (error) {
        if (error.message === "Saldo token habis") {
          addChat("❌ Token habis. Silakan top up untuk melanjutkan.", "ai");
        } else {
          addChat("❌ Terjadi kesalahan. Coba lagi.", "ai");
        }
      }
    });
  }

  function addChat(text, role) {
    const div = document.createElement("div");
    div.className = `chat ${role}`;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  /* =========================
     CERPEN (DIKUNCI)
  ========================== */
  const cerpenForm = document.getElementById("cerpenForm");
  if (cerpenForm) {
    cerpenForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const judul = document.getElementById("judul").value;
      const tema = document.getElementById("tema").value;
      const genre = document.getElementById("genre").value;

      const res = await apiFetch("/api/cerpen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judul, tema, genre }),
      });

      const data = await res.json();
      openCerpenModal(judul, data.reply);
    });
  }

  /* =========================
     SKENARIO (BARU)
  ========================== */
  const skenarioForm = document.getElementById("skenarioForm");
  if (skenarioForm) {
    skenarioForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const judul = document.getElementById("judul").value;
      const genre = document.getElementById("genre").value;
      const deskripsi = document.getElementById("deskripsi").value;

      const res = await apiFetch("/api/skenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judul, genre, deskripsi }),
      });

      const data = await res.json();
      openSkenarioModal(judul, data.reply);
    });
  }

  /* =========================
     HISTORY LIST (BARU)
  ========================== */
  const historyList = document.getElementById("historyList");
  if (historyList) {
    (async () => {
      try {
        const res = await apiFetch("/api/history");
        const data = await res.json();
        historyList.innerHTML = "";
        if (!data.items || !data.items.length) {
          historyList.innerHTML = "<li>Tidak ada history.</li>";
          return;
        }
        for (const item of data.items) {
          const li = document.createElement("li");
          li.textContent = `${item.title} — ${item.count} pesan`;
          historyList.appendChild(li);
        }
      } catch (e) {
        historyList.innerHTML = "<li>Gagal memuat history.</li>";
      }
    })();
  }
});

/* =========================
   MODAL CERPEN
========================= */
function openCerpenModal(judul, isi) {
  document.getElementById("modalJudul").innerText = judul;
  document.getElementById("modalCerpen").innerText = isi;
  document.getElementById("cerpenModal").classList.remove("hidden");
}

function closeCerpenModal() {
  document.getElementById("cerpenModal").classList.add("hidden");
}

/* =========================
   MODAL SKENARIO
========================= */
function openSkenarioModal(judul, isi) {
  document.getElementById("modalJudulSkenario").innerText = judul;
  document.getElementById("modalSkenario").innerText = isi;
  document.getElementById("skenarioModal").classList.remove("hidden");
}

function closeSkenarioModal() {
  document.getElementById("skenarioModal").classList.add("hidden");
}

/* =========================
   UTIL CERPEN (SALIN & UNDUH)
========================= */
function copyCerpen() {
  const text = document.getElementById("modalCerpen").innerText || "";
  navigator.clipboard.writeText(text);
}

function downloadTXT() {
  const title = document.getElementById("modalJudul").innerText || "Cerpen";
  const text = document.getElementById("modalCerpen").innerText || "";
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(title)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadPDF() {
  // Implementasi simpel: unduh sebagai .txt dengan ekstensi .pdf (placeholder)
  // Jika ingin PDF sebenarnya, perlu lib tambahan di server/klien.
  const title = document.getElementById("modalJudul").innerText || "Cerpen";
  const text = document.getElementById("modalCerpen").innerText || "";
  const blob = new Blob([text], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(title)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================
   UTIL SKENARIO (SALIN & UNDUH)
========================= */
function copySkenario() {
  const text = document.getElementById("modalSkenario").innerText || "";
  navigator.clipboard.writeText(text);
}

function downloadSkenarioTXT() {
  const title =
    document.getElementById("modalJudulSkenario").innerText || "Skenario";
  const text = document.getElementById("modalSkenario").innerText || "";
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(title)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadSkenarioPDF() {
  const title =
    document.getElementById("modalJudulSkenario").innerText || "Skenario";
  const text = document.getElementById("modalSkenario").innerText || "";
  const blob = new Blob([text], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(title)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

  /* =========================
     NOVEL SUITE HANDLERS
  ========================== */
  
  // Novel Create
  const novelCreateForm = document.getElementById("novelCreateForm");
  if (novelCreateForm) {
    novelCreateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const judul = document.getElementById("novelJudul").value;
      const genre = document.getElementById("novelGenre").value;
      const tema = document.getElementById("novelTema").value;
      const panjang = document.getElementById("novelPanjang").value;

      const res = await apiFetch("/api/novel/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judul, genre, tema, panjang }),
      });

      const data = await res.json();
      alert(data.reply || "Novel generated!");
    });
  }

  // Novel Continue
  const novelContinueForm = document.getElementById("novelContinueForm");
  if (novelContinueForm) {
    novelContinueForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const context = document.getElementById("novelContext").value;
      const arahan = document.getElementById("novelArahan").value;

      const res = await apiFetch("/api/novel/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, arahan }),
      });

      const data = await res.json();
      alert(data.reply || "Continue generated!");
    });
  }

  // Novel Outline
  const novelOutlineForm = document.getElementById("novelOutlineForm");
  if (novelOutlineForm) {
    novelOutlineForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const judul = document.getElementById("outlineJudul").value;
      const genre = document.getElementById("outlineGenre").value;
      const tema = document.getElementById("outlineTema").value;
      const jumlahBab = parseInt(document.getElementById("outlineJumlahBab").value) || 10;

      const res = await apiFetch("/api/novel/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judul, genre, tema, jumlahBab }),
      });

      const data = await res.json();
      alert(data.reply || "Outline generated!");
    });
  }

  // Novel Character
  const novelCharacterForm = document.getElementById("novelCharacterForm");
  if (novelCharacterForm) {
    novelCharacterForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nama = document.getElementById("charNama").value;
      const peran = document.getElementById("charPeran").value;
      const kepribadian = document.getElementById("charKepribadian").value;
      const latar = document.getElementById("charLatar").value;
      const tujuan = document.getElementById("charTujuan").value;

      const res = await apiFetch("/api/novel/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, peran, kepribadian, latar, tujuan }),
      });

      const data = await res.json();
      alert(data.reply || "Character generated!");
    });
  }

  // Novel World Building
  const novelWorldForm = document.getElementById("novelWorldForm");
  if (novelWorldForm) {
    novelWorldForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nama = document.getElementById("worldNama").value;
      const setting = document.getElementById("worldSetting").value;
      const sistem = document.getElementById("worldSistem").value;
      const budaya = document.getElementById("worldBudaya").value;

      const res = await apiFetch("/api/novel/world", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, setting, sistem, budaya }),
      });

      const data = await res.json();
      alert(data.reply || "World building generated!");
    });
  }
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9\-_. ]/gi, "_").trim() || "file";
}
