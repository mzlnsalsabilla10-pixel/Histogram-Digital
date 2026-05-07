(function () {
    const registerForm = document.getElementById("registerForm");
    const fullNameInput = document.getElementById("registerFullName");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const confirmPasswordInput = document.getElementById("registerConfirmPassword");
    const authMessage = document.getElementById("authMessage");
    const submitButton = document.getElementById("registerSubmitButton");

    function setMessage(text, type = "error") {
        authMessage.textContent = text;
        authMessage.className = `auth-message ${type}`;
        authMessage.hidden = false;
    }

    function setLoading(isLoading) {
        submitButton.disabled = isLoading;
        submitButton.textContent = isLoading ? "Mendaftarkan..." : "Daftar";
    }

    async function ensureMandiriProfile(user, fullName) {
        const auth = window.HistogramAuth;
        const existingProfile = await auth.getProfileByUserId(user.id);
        if (existingProfile) return existingProfile;

        const payload = {
            id: user.id,
            full_name: fullName,
            username: null,
            student_code: null,
            user_type: "mandiri",
            class_name: null,
            group_name: null
        };

        const { data, error } = await auth.supabase
            .from("profiles")
            .insert(payload)
            .select("id, full_name, username, student_code, class_name, group_name, user_type, is_active")
            .single();

        if (error) throw error;
        return data;
    }

    if (!registerForm) return;

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const auth = window.HistogramAuth;
        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!fullName || !email || !password || !confirmPassword) {
            setMessage("Semua data pendaftaran harus diisi.");
            return;
        }

        if (password !== confirmPassword) {
            setMessage("Konfirmasi password belum sama.");
            return;
        }

        if (!email.includes("@")) {
            setMessage("Gunakan email aktif untuk mendaftar sebagai pengguna mandiri.");
            return;
        }

        if (!auth?.isSupabaseConfigured || !auth.supabase) {
            setMessage("Supabase belum siap dimuat. Pastikan koneksi internet aktif dan konfigurasi Supabase sudah benar.");
            return;
        }

        setLoading(true);
        authMessage.hidden = true;

        try {
            const { data, error } = await auth.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        user_type: "mandiri"
                    }
                }
            });

            if (error) {
                setMessage(error.message || "Pendaftaran belum berhasil. Periksa kembali email dan password.");
                return;
            }

            if (data.session) {
                await ensureMandiriProfile(data.user, fullName);
                await auth.supabase.auth.signOut();
            }

            // Jika email confirmation aktif, session belum tersedia sampai email dikonfirmasi.
            // Untuk penelitian lokal, email confirmation sebaiknya dimatikan agar akun dummy/internal mudah diuji.
            auth.clearLegacyIdentity();
            sessionStorage.setItem("registeredSuccessMessage", "Pendaftaran berhasil. Silakan login menggunakan email dan password Anda.");
            window.location.href = "login.html?registered=success";
        } catch (error) {
            console.error("Register gagal:", error);
            setMessage("Akun berhasil dibuat, tetapi profil belum bisa disiapkan. Periksa RLS insert policy untuk profiles atau gunakan trigger handle_new_user.");
        } finally {
            setLoading(false);
        }
    });
})();
