(() => {
  "use strict";

  const STORAGE_KEY = "assistline_tickets";

  // ---------- Service worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.error("Echec enregistrement service worker", err);
      });
    });

    // Recharge une seule fois quand une nouvelle version du SW remplace une
    // version deja active, pour ne jamais rester bloque sur un vieux
    // app.js/css en cache. On ignore la toute premiere prise de controle
    // (controller encore null) pour ne pas recharger inutilement au tout
    // premier chargement.
    if (navigator.serviceWorker.controller) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }
  }

  // ---------- Navigation par onglets ----------
  const tabButtons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");

  function activateTab(name) {
    tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === name));
    panels.forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${name}`));
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  document.querySelectorAll(".card-link").forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.goto));
  });

  // ---------- Statut reseau ----------
  const netStatus = document.getElementById("netStatus");
  let isOnline = navigator.onLine;

  function updateNetStatus(online) {
    const wasOnline = isOnline;
    isOnline = online;
    netStatus.textContent = online ? "En ligne" : "Hors-ligne";
    netStatus.classList.toggle("status-online", online);
    netStatus.classList.toggle("status-offline", !online);
    if (online && !wasOnline) syncPendingTickets();
  }

  // navigator.onLine ne reflete que l'etat de l'interface reseau, pas un
  // vrai acces a Internet : on verifie activement via une requete legere.
  async function probeConnectivity() {
    if (!navigator.onLine) { updateNetStatus(false); return; }
    try {
      await fetch(`./manifest.json?probe=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      updateNetStatus(true);
    } catch {
      updateNetStatus(false);
    }
  }

  updateNetStatus(navigator.onLine);
  probeConnectivity();
  setInterval(probeConnectivity, 5000);
  window.addEventListener("online", probeConnectivity);
  window.addEventListener("offline", () => updateNetStatus(false));

  // ---------- Toast ----------
  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3000);
  }

  // ---------- Installation PWA ----------
  const installBtn = document.getElementById("installBtn");
  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installBtn.hidden = false;
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    installBtn.hidden = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });

  window.addEventListener("appinstalled", () => {
    installBtn.hidden = true;
    showToast("AssistLine a ete installee !");
  });

  // ---------- Tickets (avec file d'attente hors-ligne) ----------
  const ticketForm = document.getElementById("ticketForm");
  const ticketList = document.getElementById("ticketList");
  const ticketsEmpty = document.getElementById("ticketsEmpty");

  function loadTickets() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveTickets(tickets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }

  function renderTickets() {
    const tickets = loadTickets().sort((a, b) => b.date - a.date);
    ticketList.innerHTML = "";
    ticketsEmpty.hidden = tickets.length > 0;

    tickets.forEach((ticket) => {
      const li = document.createElement("li");
      li.className = "ticket-item";
      const statusLabel = ticket.status === "synced" ? "Synchronise" : "En attente de reseau";
      const statusClass = ticket.status === "synced" ? "pill-synced" : "pill-pending";
      const urgentPill = ticket.priority === "Urgente" ? '<span class="pill pill-urgent">Urgent</span>' : "";
      li.innerHTML = `
        <div class="ticket-top">
          <span class="ticket-subject">${escapeHtml(ticket.subject)}${urgentPill}</span>
          <span class="pill ${statusClass}">${statusLabel}</span>
        </div>
        <p class="ticket-msg">${escapeHtml(ticket.message)}</p>
        <div class="ticket-meta">${new Date(ticket.date).toLocaleString("fr-FR")}</div>
      `;
      ticketList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  ticketForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const subject = document.getElementById("subject").value;
    const priority = document.getElementById("priority").value;
    const message = document.getElementById("message").value.trim();
    if (!subject || !message) return;

    const tickets = loadTickets();
    tickets.push({
      id: Date.now(),
      subject,
      priority,
      message,
      date: Date.now(),
      status: navigator.onLine ? "synced" : "pending",
    });
    saveTickets(tickets);
    renderTickets();
    ticketForm.reset();
    activateTab("tickets");
    showToast(navigator.onLine ? "Ticket envoye a la hotline." : "Hors-ligne : ticket mis en file d'attente.");
  });

  function syncPendingTickets() {
    const tickets = loadTickets();
    const pending = tickets.filter((t) => t.status === "pending");
    if (pending.length === 0) return;
    pending.forEach((t) => { t.status = "synced"; });
    saveTickets(tickets);
    renderTickets();
    showToast(`${pending.length} ticket(s) synchronise(s) avec la hotline.`);
  }

  renderTickets();

  // ---------- FAQ Accordion ----------
  document.querySelectorAll(".accordion-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      trigger.closest(".accordion-item").classList.toggle("open");
    });
  });

  // ---------- Notification demo ----------
  const notifyBtn = document.getElementById("notifyBtn");
  notifyBtn.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      showToast("Les notifications ne sont pas supportees par ce navigateur.");
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      showToast("Notification refusee.");
      return;
    }

    const title = "AssistLine - Nouvelle reponse";
    const options = {
      body: "Un agent a repondu a votre ticket. Ouvrez l'app pour le consulter.",
      icon: "icons/icon.svg",
      badge: "icons/icon.svg",
    };

    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  });
})();
