(function () {
    const greeting = document.getElementById("sapaanJudul");
    const logoutButton = document.getElementById("logoutButton");

    async function renderProfileGreeting() {
        const auth = window.HistogramAuth;
        if (!auth || !greeting) return;

        const profile = await auth.getCurrentProfile({ allowLegacyFallback: true });
        if (!profile) return;

        greeting.innerHTML = auth.formatGreeting(profile);
    }

    renderProfileGreeting();

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;
            logoutButton.textContent = "Keluar...";

            try {
                if (window.HistogramAuth) {
                    await window.HistogramAuth.signOutAndReset({ redirectTo: "login.html" });
                    return;
                }

                [
                    "login",
                    "namaLengkap",
                    "kelompokNama",
                    "kelompokKelas",
                    "userType",
                    "userId",
                    "supabaseProfile"
                ].forEach((key) => localStorage.removeItem(key));
                window.location.href = "login.html";
            } catch (error) {
                console.error("Logout gagal:", error);
                logoutButton.disabled = false;
                logoutButton.textContent = "Keluar";
                alert("Sesi belum berhasil ditutup. Coba lagi sebentar ya.");
            }
        });
    }
})();
