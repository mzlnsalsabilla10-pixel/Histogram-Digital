/* ============================================================
   CEK LOGIN - WAJIB SEBELUM MASUK WEB
   ============================================================ */
const LEVEL_META = [
    {
        no: 1,
        world: "World 1",
        title: "Graph Lab",
        hook: "Membedakan diagram batang dan histogram dari petunjuk visual.",
        reward: "Badge Pengintai Grafik",
        xp: 120
    },
    {
        no: 2,
        world: "World 2",
        title: "Data Collection",
        hook: "Mengumpulkan minimal 25 data numerik kontinu dari dunia nyata.",
        reward: "Badge Pengumpul Data",
        xp: 160
    },
    {
        no: 3,
        world: "World 3",
        title: "Data Structuring",
        hook: "Mengolah data menjadi tabel distribusi frekuensi yang akurat.",
        reward: "Badge Penjaga Interval",
        xp: 180
    },
    {
        no: 4,
        world: "World 4",
        title: "Histogram Builder",
        hook: "Membangun histogram lengkap dari tabel distribusi frekuensi.",
        reward: "Badge Arsitek Histogram",
        xp: 220
    },
    {
        no: 5,
        world: "World 5",
        title: "Reflection",
        hook: "Meninjau strategi, pemahaman, dan perbaikan belajar.",
        reward: "Badge Penjelajah Bermakna",
        xp: 120
    }
];

function cekLogin() {
    if (!localStorage.getItem("namaLengkap") || !localStorage.getItem("kelompokNama") || !localStorage.getItem("kelompokKelas")) {
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

        const status = card.querySelector(".card-status");
        if (status) {
            const done = localStorage.getItem(`aktivitas${no}`) === "true";
            status.classList.remove("status-locked");
            status.classList.add(done ? "status-done" : "status-open");
            status.textContent = done ? "Selesai" : "Tersedia";
        }
    }
}

function bukaHalaman(file) {
    window.location.href = file;
}

function getLevelMeta(no) {
    return LEVEL_META.find((item) => item.no === no);
}

function isLevelDone(no) {
    return localStorage.getItem(`aktivitas${no}`) === "true";
}

function isLevelUnlocked(no) {
    if (no === 1) return true;
    if (no === 2) return localStorage.getItem("aktivitas2_unlock") === "true";
    return isLevelDone(no - 1);
}

function getGameProgress() {
    const completed = LEVEL_META.filter((item) => isLevelDone(item.no));
    const xp = completed.reduce((total, item) => total + item.xp, 0);
    const badges = completed.map((item) => item.reward);
    const nextLevel = LEVEL_META.find((item) => !isLevelDone(item.no));

    return {
        completedCount: completed.length,
        xp,
        badges,
        nextLevel
    };
}

/* ============================================================
   CEK IZIN AKSES (Agar tidak lompat aktivitas)
   ============================================================ */
function cekAkses(noAktivitas) {
    cekLogin();

    if (noAktivitas > 1) {
        const prev = noAktivitas - 1;
        if (localStorage.getItem(`aktivitas${prev}`) !== "true") {
            alert("Aktivitas ini belum bisa dibuka.\nSelesaikan aktivitas sebelumnya dulu ya!");
            window.location.href = "beranda.html";
        }
    }
}

/* ============================================================
   SELESAIKAN AKTIVITAS
   ============================================================ */
function selesaiAktivitas(no) {
    localStorage.setItem(`aktivitas${no}`, "true");
    alert("Aktivitas selesai! Kamu bisa lanjut ke aktivitas berikutnya.");
    window.location.href = "beranda.html";
}

/* ============================================================
   HOTSPOT - AKTIVITAS 1
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
const ENDPOINT = "";

async function saveResult(payload) {
    if (!ENDPOINT) return;

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
        unlock(2);
        if (typeof renderProgress === "function") {
            renderProgress();
        }
    } else {
        alert("Kode salah. Silakan periksa kembali kode dari guru.");
    }
}
