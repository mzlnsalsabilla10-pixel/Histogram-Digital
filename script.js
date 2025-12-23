/* ============================================================
   CEK LOGIN — WAJIB SEBELUM MASUK WEB
   ============================================================ */
function cekLogin() {
    if (!localStorage.getItem("kelompokNama")) {
        window.location.href = "login.html";
    }
}


/* ============================================================
   SYSTEM LOCK / UNLOCK (Aktivitas Berurutan)
   ============================================================ */

function cekStatusAwal() {
    if (localStorage.getItem("aktivitas2_unlock") === "true") unlock(2);
    if (localStorage.getItem("aktivitas1") === "true") unlock(1);
    if (localStorage.getItem("aktivitas2") === "true") unlock(3);
    if (localStorage.getItem("aktivitas3") === "true") unlock(4);
    if (localStorage.getItem("aktivitas4") === "true") unlock(5);
}

function unlock(no) {
    const card = document.getElementById(`card${no}`);
    if (card) {
        card.classList.remove("locked");
        card.classList.add("unlocked");

        const overlay = card.querySelector(".lock-overlay");
        if (overlay) overlay.remove();

        card.onclick = () => bukaHalaman(`aktivitas${no}.html`);
    }
}

function bukaHalaman(file) {
    window.location.href = file;
}


/* ============================================================
   CEK IZIN AKSES (Agar tidak lompat aktivitas)
   ============================================================ */

function cekAkses(noAktivitas) {
    // tidak boleh masuk halaman aktivitas jika belum login
    cekLogin();

    if (noAktivitas > 1) {
        const prev = noAktivitas - 1;
        if (localStorage.getItem(`aktivitas${prev}`) !== "true") {
            alert("Aktivitas ini belum bisa dibuka.\nSelesaikan aktivitas sebelumnya dulu ya!");
            window.location.href = "index.html";
        }
    }
}


/* ============================================================
   SELESAIKAN AKTIVITAS
   ============================================================ */

function selesaiAktivitas(no) {
    localStorage.setItem(`aktivitas${no}`, "true");
    alert("Aktivitas selesai! Kamu bisa lanjut ke aktivitas berikutnya.");
    window.location.href = "index.html";
}


/* ============================================================
   HOTSPOT — AKTIVITAS 1
   ============================================================ */

let benar = 0;
const targetBenar = 3;

function klikHotspot(el, status) {
    if (status === "benar") {
        el.classList.add("correct");
        benar++;
    } else {
        el.classList.add("wrong");
    }

    el.style.pointerEvents = "none";

    if (benar >= targetBenar) {
        document.getElementById("btnSelesai").style.display = "inline-block";
    }
}


/* ============================================================
   KIRIM DATA KE SPREADSHEET (NANTI)
   ============================================================ */

// masukkan URL Google Apps Script ke sini nanti
const ENDPOINT = ""; 

async function saveResult(payload) {
    if (!ENDPOINT) return; // kalau belum ada endpoint, skip dulu

    try {
        await fetch(ENDPOINT, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        console.log("Terkirim:", payload);
    } catch (e) {
        console.error("Gagal mengirim:", e);
    }
}

function cekKodeAkt2() {
    const kode = document.getElementById("kodeAkt2").value.trim();

    if (kode === "HISTO2") {
        localStorage.setItem("aktivitas2_unlock", "true");
        alert("Aktivitas 2 berhasil dibuka. Silakan lanjutkan.");
        unlock(2); // buka card aktivitas 2
    } else {
        alert("Kode salah. Silakan periksa kembali kode dari guru.");
    }
}
