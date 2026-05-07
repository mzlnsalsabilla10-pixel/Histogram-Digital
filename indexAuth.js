(function () {
    const navAction = document.getElementById("navAction");
    const heroPrimaryAction = document.getElementById("heroPrimaryAction");

    function setLoggedInButtons() {
        if (navAction) {
            navAction.textContent = "Kembali ke Beranda";
            navAction.href = "beranda.html";
        }

        if (heroPrimaryAction) {
            heroPrimaryAction.textContent = "Kembali ke Beranda";
            heroPrimaryAction.href = "beranda.html";
        }
    }

    async function refreshLandingAuthState() {
        if (localStorage.getItem("login") === "true") {
            setLoggedInButtons();
        }

        if (!window.HistogramAuth) return;

        try {
            const profile = await window.HistogramAuth.getCurrentProfile({ allowLegacyFallback: true });
            if (profile) {
                setLoggedInButtons();
            }
        } catch (error) {
            console.warn("Gagal memeriksa session di halaman awal.", error);
        }
    }

    refreshLandingAuthState();
})();
