<?php
require_once 'db.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

// 1. OBTENIR TOUTES LES DONNÉES
if ($action === 'get_all') {
    try {
        // Demandes (qui alimentent la liste des clients)
        $stmt = $pdo->query("SELECT * FROM demandes ORDER BY id DESC");
        $demandes = $stmt->fetchAll();

        // Produits
        $stmt = $pdo->query("SELECT * FROM produits ORDER BY id DESC");
        $produits = $stmt->fetchAll();

        // Sondages
        $stmt = $pdo->query("SELECT * FROM sondages ORDER BY id DESC");
        $sondages = $stmt->fetchAll();

        echo json_encode([
            'success' => true,
            'demandes' => $demandes,
            'produits' => $produits,
            'sondages' => $sondages
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 2. ENREGISTRER UNE DEMANDE DE CONTACT
if ($action === 'add_demande' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $nom = $_POST['nom'] ?? '';
        $telephone = $_POST['telephone'] ?? '';
        $email = $_POST['email'] ?? '';
        $societe = $_POST['societe'] ?? '';
        $type = $_POST['type_demande'] ?? 'Commercial';
        $urgence = $_POST['urgence'] ?? 'Moyen';
        $sujet = $_POST['sujet'] ?? '';
        $message = $_POST['message'] ?? '';

        // Référence automatique
        $stmtCount = $pdo->query("SELECT COUNT(*) FROM demandes");
        $count = $stmtCount->fetchColumn() + 1;
        $ref = 'PP-' . str_pad($count, 6, '0', STR_PAD_LEFT);

        // Gestion de la pièce jointe
        $pjNom = null;
        $pjPath = null;
        if (isset($_FILES['pieceJointe']) && $_FILES['pieceJointe']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = 'uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            $ext = pathinfo($_FILES['pieceJointe']['name'], PATHINFO_EXTENSION);
            $pjNom = $_FILES['pieceJointe']['name'];
            $pjPath = $uploadDir . uniqid('pj_', true) . '.' . $ext;
            move_uploaded_file($_FILES['pieceJointe']['tmp_name'], $pjPath);
        }

        $sql = "INSERT INTO demandes (ref, nom, telephone, email, societe, type_demande, urgence, sujet, message, piece_jointe_nom, piece_jointe_path) 
                VALUES (:ref, :nom, :telephone, :email, :societe, :type, :urgence, :sujet, :message, :pj_nom, :pj_path)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'ref' => $ref,
            'nom' => $nom,
            'telephone' => $telephone,
            'email' => $email,
            'societe' => $societe,
            'type' => $type,
            'urgence' => $urgence,
            'sujet' => $sujet,
            'message' => $message,
            'pj_nom' => $pjNom,
            'pj_path' => $pjPath
        ]);

        echo json_encode(['success' => true, 'ref' => $ref]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 3. METTRE À JOUR LE STATUT D'UNE DEMANDE/CLIENT
if ($action === 'update_statut' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $ref = $input['ref'] ?? '';
        $statut = $input['statut'] ?? 'En attente';

        $stmt = $pdo->prepare("UPDATE demandes SET statut = :statut WHERE ref = :ref");
        $stmt->execute(['statut' => $statut, 'ref' => $ref]);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 4. SUPPRIMER UNE DEMANDE/CLIENT
if ($action === 'delete_client' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $ref = $input['ref'] ?? '';

        // Récupérer le chemin de la pièce jointe pour la supprimer du serveur
        $stmt = $pdo->prepare("SELECT piece_jointe_path FROM demandes WHERE ref = :ref");
        $stmt->execute(['ref' => $ref]);
        $path = $stmt->fetchColumn();
        if ($path && file_exists($path)) {
            unlink($path);
        }

        $stmt = $pdo->prepare("DELETE FROM demandes WHERE ref = :ref");
        $stmt->execute(['ref' => $ref]);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 5. ENREGISTRER UN SONDAGE
if ($action === 'add_sondage' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $client = $input['client'] ?? '';
        $note = $input['note'] ?? 5;
        $commentaire = $input['commentaire'] ?? '';

        $stmt = $pdo->prepare("INSERT INTO sondages (client, note, commentaire) VALUES (:client, :note, :commentaire)");
        $stmt->execute(['client' => $client, 'note' => $note, 'commentaire' => $commentaire]);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 6. ENREGISTRER UN PRODUIT/MATÉRIEL
if ($action === 'add_produit' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $nom = $_POST['nom'] ?? '';
        $prix = intval($_POST['prix'] ?? 0);
        $stock = intval($_POST['stock'] ?? 0);
        
        $mediaPath = null;
        $isVideo = 0;

        if (isset($_FILES['produitMedia']) && $_FILES['produitMedia']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = 'uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            $ext = pathinfo($_FILES['produitMedia']['name'], PATHINFO_EXTENSION);
            $isVideo = strpos($_FILES['produitMedia']['type'], 'video/') === 0 ? 1 : 0;
            $mediaPath = $uploadDir . uniqid('prod_', true) . '.' . $ext;
            move_uploaded_file($_FILES['produitMedia']['tmp_name'], $mediaPath);
        }

        $stmt = $pdo->prepare("INSERT INTO produits (nom, prix, stock, media_path, is_video) VALUES (:nom, :prix, :stock, :media_path, :is_video)");
        $stmt->execute(['nom' => $nom, 'prix' => $prix, 'stock' => $stock, 'media_path' => $mediaPath, 'is_video' => $isVideo]);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

echo json_encode(['success' => false, 'error' => 'Action inconnue']);
?>
