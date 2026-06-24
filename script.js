document.addEventListener('DOMContentLoaded', () => {
    // Variables globales synchronisées depuis MySQL via api.php
    let savedSondages = [];
    let savedProduits = [];
    let demandesData = []; // Remplace demandesData et clientsData qui sont désormais issus de la même table MySQL `demandes`
    let clientsData = [];

    // KPI State
    let totalCommandes = parseInt(localStorage.getItem('pentagoneCommandes')) || 0;

    // Charger toutes les données depuis l'API PHP MySQL au démarrage
    function chargerDonneesDepuisServeur() {
        fetch('api.php?action=get_all')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Mettre à jour les variables avec les données du serveur
                    demandesData = data.demandes;
                    clientsData = data.demandes; // Les clients proviennent des demandes de support enregistrées
                    savedSondages = data.sondages;
                    savedProduits = data.produits;

                    // Mettre à jour l'affichage
                    renderAllDemandes();
                    renderAllClients();
                    renderSondagesList();
                    renderCatalog();

                    // Mettre à jour les KPIs globaux
                    mettreAJourKpis();
                } else {
                    console.error("Erreur de récupération des données :", data.error);
                }
            })
            .catch(err => console.error("Erreur serveur :", err));
    }

    function mettreAJourKpis() {
        const kpiCommandes = document.getElementById('kpi-commandes');
        if (kpiCommandes) kpiCommandes.textContent = totalCommandes;

        const kpiSondages = document.getElementById('kpi-sondages');
        if (kpiSondages) kpiSondages.textContent = savedSondages.length;

        const kpiNote = document.getElementById('kpi-note');
        if (kpiNote) {
            const sumNotes = savedSondages.reduce((sum, s) => sum + parseInt(s.note), 0);
            const totalSondages = savedSondages.length;
            kpiNote.textContent = (totalSondages > 0 ? (sumNotes / totalSondages).toFixed(1) : "0.0") + ' / 5';
        }
        updateSupportKpis();
        updateClientsKpis(clientsData);
    }

    const menuToggle = document.getElementById('menuToggle');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebar = document.getElementById('sidebar');
    const contactForm = document.getElementById('contactForm');

    // Toggle Sidebar for mobile
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
        });
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (sidebar && !sidebar.contains(e.target) && menuToggle && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });

    // Handle Navigation
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active from all nav items
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            
            // Add active to clicked nav item
            item.classList.add('active');
            
            // Hide all sections
            contentSections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Show target section
            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
                localStorage.setItem('activeSection', targetId);
            }

            // Close sidebar on mobile after navigation
            if (e.isTrusted && window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove('active');
            }
        });
    });

    // Restore active section
    const savedSection = localStorage.getItem('activeSection');
    if (savedSection) {
        const targetNav = document.querySelector(`.nav-item[data-target="${savedSection}"]`);
        if (targetNav) {
            targetNav.click();
        }
    }

    // ===================================================
    // CONTACT & SUPPORT - Logique MySQL
    // ===================================================

    // Générer le numéro de référence
    function genererRef() {
        const num = demandesData.length + 1;
        return 'PP-' + String(num).padStart(6, '0');
    }

    // Afficher la date du jour dans l'en-tête du formulaire
    const refDateEl = document.getElementById('refDate');
    const refNumeroEl = document.getElementById('refNumero');
    if (refDateEl) {
        const now = new Date();
        refDateEl.textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    if (refNumeroEl) refNumeroEl.textContent = genererRef();

    // Mettre à jour les KPIs support
    function updateSupportKpis() {
        const total = demandesData.length;
        const urgentes = demandesData.filter(d => d.urgence === 'Urgent').length;
        const enAttente = demandesData.filter(d => d.statut === 'En attente').length;
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('kpiTotalDemandes', total);
        el('kpiUrgent', urgentes);
        el('kpiEnAttente', enAttente);
    }

    // Pièce jointe
    let pieceJointeSelected = null;
    const pieceJointeInput = document.getElementById('pieceJointe');
    const pjPreview = document.getElementById('pjPreview');
    const pjFileName = document.getElementById('pjFileName');
    const removePjBtn = document.getElementById('removePj');
    const pjDropZone = document.getElementById('pjDropZone');

    if (pieceJointeInput) {
        pieceJointeInput.addEventListener('change', () => {
            if (pieceJointeInput.files && pieceJointeInput.files[0]) {
                handlePieceJointe(pieceJointeInput.files[0]);
            }
        });
    }
    if (pjDropZone) {
        pjDropZone.addEventListener('dragover', e => { e.preventDefault(); pjDropZone.style.borderColor = 'var(--bleu-action)'; });
        pjDropZone.addEventListener('dragleave', () => { pjDropZone.style.borderColor = ''; });
        pjDropZone.addEventListener('drop', e => {
            e.preventDefault();
            pjDropZone.style.borderColor = '';
            if (e.dataTransfer.files[0]) handlePieceJointe(e.dataTransfer.files[0]);
        });
    }
    if (removePjBtn) {
        removePjBtn.addEventListener('click', () => {
            pieceJointeSelected = null;
            if (pjPreview) pjPreview.style.display = 'none';
            if (pjDropZone) pjDropZone.style.display = 'block';
            if (pieceJointeInput) pieceJointeInput.value = '';
        });
    }

    function handlePieceJointe(file) {
        if (file.size > 5 * 1024 * 1024) { alert('Fichier trop volumineux ! Maximum 5 Mo.'); return; }
        pieceJointeSelected = file;
        if (pjFileName) pjFileName.textContent = file.name;
        if (pjPreview) pjPreview.style.display = 'flex';
        if (pjDropZone) pjDropZone.style.display = 'none';
    }

    // Rendu d'une demande dans l'historique
    function renderDemande(demande) {
        const list = document.getElementById('historiqueList');
        if (!list) return;
        const card = document.createElement('div');
        card.className = 'demande-card';

        const urgenceColors = { 'Faible': '#10B981', 'Moyen': '#D97706', 'Urgent': '#EF4444' };
        const urgenceIcons = { 'Faible': '🟢', 'Moyen': '🟡', 'Urgent': '🔴' };
        const typeColors = { 'Commercial': 'var(--or-vente)', 'Technique': 'var(--bleu-action)', 'SAV': 'var(--violet-qualite)', 'Devis': 'var(--vert-operationnel)' };
        const statutIcons = { 'En attente': '⏳ En attente', 'Traité': '✅ Traité', 'Annulé': '❌ Annulé' };

        const color = urgenceColors[demande.urgence] || '#64748B';
        const typeColor = typeColors[demande.type_demande] || 'var(--bleu-action)';

        card.innerHTML = `
            <div class="demande-card-header" style="border-left:4px solid ${color};">
                <div class="demande-card-top">
                    <div class="demande-ref">${demande.ref}</div>
                    <span class="demande-urgence-badge" style="background:${color}20; color:${color}; border:1px solid ${color}50;">
                        ${urgenceIcons[demande.urgence]} ${demande.urgence}
                    </span>
                    <span class="demande-type-badge" style="background:${typeColor}20; color:${typeColor}; border:1px solid ${typeColor}50;">${demande.type_demande}</span>
                    <span class="demande-statut">${statutIcons[demande.statut] || demande.statut}</span>
                </div>
                <div class="demande-sujet">${demande.sujet}</div>
                <div class="demande-meta">
                    <span><i class="fas fa-user"></i> ${demande.nom}</span>
                    ${demande.societe ? `<span><i class="fas fa-building"></i> ${demande.societe}</span>` : ''}
                    <span><i class="fas fa-phone"></i> ${demande.telephone}</span>
                    <span><i class="fas fa-envelope"></i> ${demande.email}</span>
                    <span><i class="fas fa-calendar"></i> ${demande.created_at}</span>
                </div>
                <p class="demande-message">${demande.message}</p>
                ${demande.piece_jointe_path ? `
                <div class="demande-pj">
                    <i class="fas fa-paperclip"></i>
                    <a href="${demande.piece_jointe_path}" download="${demande.piece_jointe_nom}" title="Télécharger">${demande.piece_jointe_nom}</a>
                </div>` : ''}
            </div>
        `;
        list.appendChild(card);
    }

    // Afficher l'historique
    function renderAllDemandes() {
        const list = document.getElementById('historiqueList');
        const card = document.getElementById('historiqueCard');
        if (!list) return;
        list.innerHTML = '';
        if (demandesData.length > 0) {
            if (card) card.style.display = 'block';
            demandesData.forEach(d => renderDemande(d));
        } else {
            if (card) card.style.display = 'none';
        }
        updateSupportKpis();
        if (refNumeroEl) refNumeroEl.textContent = genererRef();
    }

    // Soumission du formulaire de contact
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData(contactForm);
            if (pieceJointeSelected) {
                formData.append('pieceJointe', pieceJointeSelected);
            }

            const btn = document.getElementById('submitContactBtn');
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
            btn.disabled = true;

            fetch('api.php?action=add_demande', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    btn.innerHTML = '<i class="fas fa-check"></i> Demande Envoyée !';
                    btn.style.backgroundColor = '#10B981';
                    
                    contactForm.reset();
                    pieceJointeSelected = null;
                    if (pjPreview) pjPreview.style.display = 'none';
                    if (pjDropZone) pjDropZone.style.display = 'block';

                    // Recharger les données depuis le serveur
                    chargerDonneesDepuisServeur();

                    setTimeout(() => {
                        btn.innerHTML = orig;
                        btn.style.backgroundColor = '';
                        btn.disabled = false;
                        document.getElementById('historiqueCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 2000);
                } else {
                    alert("Erreur lors de l'enregistrement : " + result.error);
                    btn.innerHTML = orig;
                    btn.disabled = false;
                }
            })
            .catch(err => {
                alert("Erreur de connexion serveur.");
                btn.innerHTML = orig;
                btn.disabled = false;
            });
        });
    }

    // ===================================================
    // MODULE CLIENTS
    // ===================================================

    function updateClientsKpis(data) {
        const total = data.length;
        const commercial = data.filter(c => c.type_demande === 'Commercial' || c.type_demande === 'Devis').length;
        const tech = data.filter(c => c.type_demande === 'Technique' || c.type_demande === 'SAV').length;
        const urgent = data.filter(c => c.urgence === 'Urgent').length;
        const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        set('kpiTotalClients', total);
        set('kpiClientsCommercial', commercial);
        set('kpiClientsTechnique', tech);
        set('kpiClientsUrgent', urgent);
        const cnt = document.getElementById('clientsCount');
        if (cnt) cnt.textContent = total + ' client' + (total > 1 ? 's' : '') + ' trouvé' + (total > 1 ? 's' : '');
    }

    const urgenceColors = { 'Faible': '#10B981', 'Moyen': '#D97706', 'Urgent': '#EF4444' };
    const urgenceIcons  = { 'Faible': '🟢', 'Moyen': '🟡', 'Urgent': '🔴' };
    const typeColors    = { 'Commercial': 'var(--or-vente)', 'Technique': 'var(--bleu-action)', 'SAV': 'var(--violet-qualite)', 'Devis': 'var(--vert-operationnel)' };
    const statutColors  = { 'En attente': '#D97706', 'Traité': '#10B981', 'Annulé': '#EF4444' };

    function renderClientRow(client, tbody) {
        const tr = document.createElement('tr');
        tr.dataset.clientId = client.ref;
        const uc = urgenceColors[client.urgence] || '#64748B';
        const tc = typeColors[client.type_demande] || 'var(--bleu-action)';
        const sc = statutColors[client.statut] || '#64748B';
        tr.innerHTML = `
            <td><span class="client-ref">${client.ref}</span></td>
            <td>
                <div class="client-name-cell">
                    <div class="client-avatar">${client.nom.charAt(0).toUpperCase()}</div>
                    <span>${client.nom}</span>
                </div>
            </td>
            <td>${client.societe || '—'}</td>
            <td><a href="tel:${client.telephone}" class="client-link"><i class="fas fa-phone"></i> ${client.telephone}</a></td>
            <td>${client.email ? `<a href="mailto:${client.email}" class="client-link"><i class="fas fa-envelope"></i> ${client.email}</a>` : '—'}</td>
            <td><span class="client-badge" style="background:${tc}20;color:${tc};border:1px solid ${tc}50;">${client.type_demande}</span></td>
            <td><span class="client-badge" style="background:${uc}20;color:${uc};border:1px solid ${uc}50;">${urgenceIcons[client.urgence]} ${client.urgence}</span></td>
            <td class="client-sujet-cell" title="${client.sujet}">${client.sujet}</td>
            <td style="white-space:nowrap;font-size:0.82rem;color:var(--text-muted);">${client.created_at}</td>
            <td>
                <select class="statut-select" data-ref="${client.ref}" style="border:1px solid ${sc}50;color:${sc};background:${sc}20;">
                    <option value="En attente" ${client.statut==='En attente'?'selected':''}>⏳ En attente</option>
                    <option value="Traité" ${client.statut==='Traité'?'selected':''}>✅ Traité</option>
                    <option value="Annulé" ${client.statut==='Annulé'?'selected':''}>❌ Annulé</option>
                </select>
            </td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="client-action-btn view-client-btn" title="Voir détail"><i class="fas fa-eye"></i></button>
                    <button class="client-action-btn delete-client-btn" title="Supprimer" style="color:#EF4444;"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;

        // Changement de statut sur le serveur
        tr.querySelector('.statut-select').addEventListener('change', function() {
            const newStatut = this.value;
            fetch('api.php?action=update_statut', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ref: this.dataset.ref, statut: newStatut })
            })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    const newSc = statutColors[newStatut] || '#64748B';
                    this.style.color = newSc;
                    this.style.background = newSc + '20';
                    this.style.borderColor = newSc + '50';
                    chargerDonneesPermanentesSansRechargementPage();
                } else {
                    alert("Erreur de mise à jour.");
                }
            });
        });

        // Voir détail
        tr.querySelector('.view-client-btn').addEventListener('click', () => openClientModal(client));

        // Supprimer sur le serveur
        tr.querySelector('.delete-client-btn').addEventListener('click', () => {
            if (!confirm('Supprimer ce client/demande définitivement ?')) return;
            fetch('api.php?action=delete_client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ref: client.ref })
            })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    tr.style.transition = 'all 0.3s';
                    tr.style.opacity = '0';
                    tr.style.transform = 'translateX(20px)';
                    setTimeout(() => chargerDonneesDepuisServeur(), 300);
                } else {
                    alert("Erreur lors de la suppression.");
                }
            });
        });

        tbody.appendChild(tr);
    }

    function chargerDonneesPermanentesSansRechargementPage() {
        fetch('api.php?action=get_all')
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    demandesData = data.demandes;
                    clientsData = data.demandes;
                    mettreAJourKpis();
                }
            });
    }

    function renderAllClients() {
        const tbody = document.getElementById('clientsTableBody');
        const empty = document.getElementById('clientsEmpty');
        const table = document.getElementById('clientsTable');
        if (!tbody) return;

        const search  = (document.getElementById('clientsSearchInput')?.value || '').toLowerCase();
        const fType   = document.getElementById('clientsFilterType')?.value || '';
        const fUrg    = document.getElementById('clientsFilterUrgence')?.value || '';

        let filtered = clientsData.filter(c => {
            const matchSearch = !search ||
                c.nom.toLowerCase().includes(search) ||
                (c.societe || '').toLowerCase().includes(search) ||
                c.email.toLowerCase().includes(search) ||
                c.telephone.includes(search) ||
                c.sujet.toLowerCase().includes(search) ||
                c.ref.toLowerCase().includes(search);
            const matchType = !fType || c.type_demande === fType;
            const matchUrg  = !fUrg  || c.urgence === fUrg;
            return matchSearch && matchType && matchUrg;
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            if (table) table.style.display = 'none';
            if (empty) empty.style.display = 'flex';
        } else {
            if (table) table.style.display = 'table';
            if (empty) empty.style.display = 'none';
            filtered.forEach(c => renderClientRow(c, tbody));
        }
        updateClientsKpis(clientsData);
    }

    // Filtres temps réel
    ['clientsSearchInput', 'clientsFilterType', 'clientsFilterUrgence'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', renderAllClients);
    });

    // Export CSV
    const exportBtn = document.getElementById('exportClientsBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (clientsData.length === 0) { alert('Aucun client à exporter !'); return; }
            const headers = ['Réf', 'Nom', 'Société', 'Téléphone', 'Email', 'Type', 'Urgence', 'Sujet', 'Date', 'Statut'];
            const rows = clientsData.map(c => [
                c.ref, c.nom, c.societe || '', c.telephone, c.email,
                c.type_demande, c.urgence, c.sujet.replace(/,/g, ';'), c.created_at, c.statut
            ].map(v => `"${v}"`).join(','));
            const csv = [headers.join(','), ...rows].join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'clients_pentagoneplus.csv'; a.click();
            URL.revokeObjectURL(url);
        });
    }

    // Modal détail client
    function openClientModal(client) {
        const modal = document.getElementById('clientDetailModal');
        const body  = document.getElementById('clientModalBody');
        const title = document.getElementById('modalClientTitle');
        if (!modal || !body) return;
        const uc = urgenceColors[client.urgence] || '#64748B';
        const tc = typeColors[client.type_demande] || 'var(--bleu-action)';
        title.textContent = client.nom + (client.societe && client.societe !== '—' ? ' — ' + client.societe : '');
        body.innerHTML = `
            <div class="modal-info-grid">
                <div class="modal-info-item"><i class="fas fa-hashtag"></i><div><label>Référence</label><span>${client.ref}</span></div></div>
                <div class="modal-info-item"><i class="fas fa-calendar"></i><div><label>Date de création</label><span>${client.created_at}</span></div></div>
                <div class="modal-info-item"><i class="fas fa-phone"></i><div><label>Téléphone</label><span><a href="tel:${client.telephone}">${client.telephone}</a></span></div></div>
                <div class="modal-info-item"><i class="fas fa-envelope"></i><div><label>Email</label><span>${client.email ? `<a href="mailto:${client.email}">${client.email}</a>` : '—'}</span></div></div>
                <div class="modal-info-item"><i class="fas fa-tag"></i><div><label>Type</label><span style="color:${tc};font-weight:600;">${client.type_demande}</span></div></div>
                <div class="modal-info-item"><i class="fas fa-fire"></i><div><label>Urgence</label><span style="color:${uc};font-weight:600;">${urgenceIcons[client.urgence]} ${client.urgence}</span></div></div>
            </div>
            <div class="modal-section">
                <label><i class="fas fa-comment-alt"></i> Sujet</label>
                <p class="modal-text modal-sujet">${client.sujet}</p>
            </div>
            <div class="modal-section">
                <label><i class="fas fa-align-left"></i> Message</label>
                <p class="modal-text">${client.message}</p>
            </div>
            ${client.piece_jointe_path ? `
            <div class="modal-section">
                <label><i class="fas fa-paperclip"></i> Pièce jointe</label>
                <a href="${client.piece_jointe_path}" download="${client.piece_jointe_nom}" class="modal-pj-link"><i class="fas fa-download"></i> ${client.piece_jointe_nom}</a>
            </div>` : ''}
        `;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    const closeModalBtn = document.getElementById('closeClientModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            document.getElementById('clientDetailModal').style.display = 'none';
            document.body.style.overflow = '';
        });
    }
    const clientModal = document.getElementById('clientDetailModal');
    if (clientModal) {
        clientModal.addEventListener('click', e => {
            if (e.target === clientModal) {
                clientModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }

    // ===================================================
    // SONDAGES LOGIC
    // ===================================================
    const addSondageBtn = document.getElementById('addSondageBtn');
    const sondageFormContainer = document.getElementById('sondageFormContainer');
    const cancelSondageBtn = document.getElementById('cancelSondageBtn');
    const sondageForm = document.getElementById('sondageForm');
    const sondagesList = document.getElementById('sondagesList');

    if (addSondageBtn) {
        addSondageBtn.addEventListener('click', () => {
            sondageFormContainer.style.display = 'block';
            addSondageBtn.style.display = 'none';
        });
    }

    if (cancelSondageBtn) {
        cancelSondageBtn.addEventListener('click', () => {
            sondageFormContainer.style.display = 'none';
            addSondageBtn.style.display = 'block';
            sondageForm.reset();
        });
    }

    function renderSondagesList() {
        if (!sondagesList) return;
        sondagesList.innerHTML = '';
        savedSondages.forEach(s => {
            const newSondage = document.createElement('div');
            newSondage.className = 'sondage-item';
            newSondage.style.cssText = 'border-bottom: 1px solid var(--border-color); padding: 15px 0;';
            newSondage.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                    <strong>Client : ${s.client}</strong>
                    <span style="color: var(--violet-qualite); font-weight: bold;">Note : ${s.note}/5 <i class="fas fa-star"></i></span>
                </div>
                <p style="color: var(--text-muted); margin-top: 5px;">"${s.commentaire}"</p>
            `;
            sondagesList.appendChild(newSondage);
        });
    }

    if (sondageForm) {
        sondageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const clientNom = document.getElementById('clientNom').value;
            const note = parseInt(document.getElementById('note').value);
            const commentaire = document.getElementById('commentaire').value;
            
            fetch('api.php?action=add_sondage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client: clientNom, note: note, commentaire: commentaire })
            })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    sondageFormContainer.style.display = 'none';
                    addSondageBtn.style.display = 'block';
                    sondageForm.reset();
                    chargerDonneesDepuisServeur();
                } else {
                    alert("Erreur lors de l'enregistrement du sondage.");
                }
            });
        });
    }

    // ===================================================
    // VENTES / CATALOGUE LOGIC
    // ===================================================
    const addProduitBtn = document.getElementById('addProduitBtn');
    const produitFormContainer = document.getElementById('produitFormContainer');
    const cancelProduitBtn = document.getElementById('cancelProduitBtn');
    const produitForm = document.getElementById('produitForm');
    const catalogGrid = document.getElementById('catalogGrid');

    if (addProduitBtn) {
        addProduitBtn.addEventListener('click', () => {
            produitFormContainer.style.display = 'block';
            addProduitBtn.style.display = 'none';
        });
    }

    if (cancelProduitBtn) {
        cancelProduitBtn.addEventListener('click', () => {
            produitFormContainer.style.display = 'none';
            addProduitBtn.style.display = 'block';
            produitForm.reset();
        });
    }

    function renderCatalog() {
        if (!catalogGrid) return;
        catalogGrid.innerHTML = '';
        savedProduits.forEach(p => {
            const newProduct = document.createElement('div');
            newProduct.className = 'card product-card';
            
            let mediaHtml = `<i class="fas fa-box" style="font-size: 3rem; color: var(--text-muted);"></i>`;
            if (p.media_path) {
                if (p.is_video == 1) {
                    mediaHtml = `<video src="${p.media_path}" controls style="width: 100%; height: 100%; object-fit: cover;"></video>`;
                } else {
                    mediaHtml = `<img src="${p.media_path}" alt="${p.nom}" style="width: 100%; height: 100%; object-fit: cover;">`;
                }
            }
            
            newProduct.innerHTML = `
                <div class="product-image" style="background-color: var(--bg-light); height: 150px; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 15px;">
                    ${mediaHtml}
                </div>
                <h3 style="font-size: 1.1rem; margin-bottom: 10px;">${p.nom}</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="color: var(--or-vente); font-weight: bold; font-size: 1.2rem;">${parseInt(p.prix).toLocaleString('fr-FR')} FCFA</span>
                    <span style="background-color: var(--vert-operationnel); color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">En Stock (${p.stock})</span>
                </div>
                <button class="btn-primary cmd-btn" style="background-color: var(--bleu-action); padding: 8px; width: 100%;"><i class="fas fa-shopping-cart"></i> Commander</button>
            `;
            
            newProduct.querySelector('.cmd-btn').addEventListener('click', () => {
                totalCommandes++;
                localStorage.setItem('pentagoneCommandes', totalCommandes);
                const kpiCommandes = document.getElementById('kpi-commandes');
                if (kpiCommandes) kpiCommandes.textContent = totalCommandes;

                const contactNav = document.querySelector('.nav-item[data-target="contact-section"]');
                if (contactNav) contactNav.click();
            });
            
            catalogGrid.appendChild(newProduct);
        });
    }

    if (produitForm) {
        produitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const prodNom = document.getElementById('prodNom').value;
            const prodPrix = document.getElementById('prodPrix').value;
            const prodStock = document.getElementById('prodStock').value;
            const prodImageInput = document.getElementById('prodImage');
            
            const formData = new FormData();
            formData.append('nom', prodNom);
            formData.append('prix', prodPrix);
            formData.append('stock', prodStock);
            if (prodImageInput.files && prodImageInput.files[0]) {
                formData.append('produitMedia', prodImageInput.files[0]);
            }

            fetch('api.php?action=add_produit', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    produitFormContainer.style.display = 'none';
                    addProduitBtn.style.display = 'block';
                    produitForm.reset();
                    chargerDonneesDepuisServeur();
                } else {
                    alert("Erreur d'ajout de matériel.");
                }
            });
        });
    }

    // Charger les données dès l'affichage de la page
    chargerDonneesDepuisServeur();
});
