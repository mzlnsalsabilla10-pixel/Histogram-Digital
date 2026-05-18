(function () {
    const loginForm = document.getElementById("loginForm");
    const identifierInput = document.getElementById("loginIdentifier");
    const passwordInput = document.getElementById("loginPassword");
    const authMessage = document.getElementById("authMessage");
    const submitButton = document.getElementById("loginSubmitButton");

    function setMessage(text, type = "error") {
        authMessage.textContent = text;
        authMessage.className = `auth-message ${type}`;
        authMessage.hidden = false;
    }

    function setLoading(isLoading) {
        submitButton.disabled = isLoading;
        submitButton.textContent = isLoading ? "Memeriksa Akun..." : "Masuk";
    }

    if (!loginForm) return;

    const params = new URLSearchParams(window.location.search);
    const registeredMessage = sessionStorage.getItem("registeredSuccessMessage");
    if (params.get("registered") === "success" || registeredMessage) {
        setMessage(registeredMessage || "Pendaftaran berhasil. Silakan login menggunakan email dan password Anda.", "success");
        sessionStorage.removeItem("registeredSuccessMessage");
        if (params.get("registered") === "success") {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const auth = window.HistogramAuth;
        const identifier = identifierInput.value.trim();
        const password = passwordInput.value;

        if (!identifier || !password) {
            setMessage("Kode akun/email dan password harus diisi.");
            return;
        }

        if (!auth?.isSupabaseConfigured || !auth.supabase) {
            setMessage("Supabase belum siap dimuat. Pastikan koneksi internet aktif dan konfigurasi Supabase sudah benar.");
            return;
        }

        setLoading(true);
        authMessage.hidden = true;

        try {
            const email = auth.resolveLoginEmail(identifier);
            const { data, error } = await auth.supabase.auth.signInWithPassword({ email, password });

            if (error || !data.user) {
                setMessage("Akun atau password tidak sesuai. Jika belum memiliki akun, silakan daftar terlebih dahulu.");
                return;
            }

            const profile = await auth.getProfileByUserId(data.user.id);
            if (!profile) {
                await auth.supabase.auth.signOut();
                setMessage("Akun berhasil masuk, tetapi data profil belum ditemukan. Hubungi guru/admin untuk melengkapi data akun.");
                return;
            }

            auth.syncLegacyProfile(profile, data.user);
            window.location.href = "beranda.html";
        } catch (error) {
            console.error("Login gagal:", error);
            setMessage("Terjadi kendala saat memeriksa akun. Coba lagi beberapa saat.");
        } finally {
            setLoading(false);
        }
    });
})();
