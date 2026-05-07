(function () {
    const GROUP_CONTEXTS = {
        "kelompok 1": {
            group_name: "Kelompok 1",
            context_key: "tinggi_badan",
            context_title: "Tinggi badan",
            unit: "cm"
        },
        "kelompok 2": {
            group_name: "Kelompok 2",
            context_key: "lama_perjalanan",
            context_title: "Lama perjalanan",
            unit: "menit"
        },
        "kelompok 3": {
            group_name: "Kelompok 3",
            context_key: "berat_badan",
            context_title: "Berat badan",
            unit: "kg"
        },
        "kelompok 4": {
            group_name: "Kelompok 4",
            context_key: "uang_saku_harian",
            context_title: "Uang saku harian",
            unit: "rupiah"
        },
        "kelompok 5": {
            group_name: "Kelompok 5",
            context_key: "waktu_tugas",
            context_title: "Waktu menyelesaikan tugas",
            unit: "menit"
        }
    };

    function normalizeGroupName(groupName) {
        return String(groupName || "").trim().replace(/\s+/g, " ").toLowerCase();
    }

    function getActivity2ContextByGroup(groupName) {
        return GROUP_CONTEXTS[normalizeGroupName(groupName)] || null;
    }

    async function loadActivity2DatasetFromSupabase(groupName) {
        const auth = window.HistogramAuth;
        const supabase = auth?.supabase;

        if (!auth?.isSupabaseConfigured || !supabase) {
            throw new Error("Supabase belum siap dimuat. Pastikan koneksi internet aktif.");
        }

        const { data, error } = await supabase
            .from("activity2_datasets")
            .select("group_name, context_key, context_title, unit, data_values, source")
            .eq("group_name", groupName)
            .maybeSingle();

        if (error) {
            console.error("Gagal memuat dataset Aktivitas 2:", error);
            throw new Error("Dataset kelompok belum tersedia. Hubungi guru/admin.");
        }

        if (!data) {
            throw new Error("Dataset kelompok belum tersedia. Hubungi guru/admin.");
        }

        const dataValues = Array.isArray(data.data_values)
            ? data.data_values.map(Number).filter((value) => Number.isFinite(value))
            : [];

        return {
            group_name: data.group_name,
            context_key: data.context_key,
            context_title: data.context_title,
            unit: data.unit,
            data_values: dataValues,
            source: data.source || "Google Form"
        };
    }

    window.Activity2Dataset = {
        getActivity2ContextByGroup,
        loadActivity2DatasetFromSupabase
    };
})();
