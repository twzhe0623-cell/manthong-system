// 1. 云端同步配置
const CLOUD_CONFIG = {
    TOKEN: localStorage.getItem('MY_GH_TOKEN') || '', 
    OWNER: 'twzhe0623-cell',
    REPO: 'manthong-system',
    FILE: 'data.json'
};

const CONFIG = {
    STORAGE_KEYS: {
        CARS: 'car_dealership_inventory_v2',
        RECYCLE: 'car_dealership_recycle_bin_v2',
        ADMIN_SESSION: 'admin_session_data'
    },
    ADMIN: { USER: 'admin', PASS: '7887', DURATION: 2 * 60 * 60 * 1000 }
};

const dataManager = {
    // 【云端下载】
    async fetchCloudData() {
        const url = `https://api.github.com/repos/${CLOUD_CONFIG.OWNER}/${CLOUD_CONFIG.REPO}/contents/${CLOUD_CONFIG.FILE}`;
        try {
            const resp = await fetch(url, {
                headers: { 'Authorization': `token ${CLOUD_CONFIG.TOKEN}` }
            });
            if (!resp.ok) return [];
            const data = await resp.json();
            
            const cars = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            localStorage.setItem(CONFIG.STORAGE_KEYS.CARS, JSON.stringify(cars));
            console.log("✅ Cloud data synced!");

            // 自动分行逻辑
            const path = window.location.pathname;
            let branch = 'all';
            if (path.includes('manthong')) branch = 'manthong';
            else if (path.includes('everforward')) branch = 'everforward';
            else if (path.includes('tscar')) branch = 'tscar';

            if (document.getElementById('inventory-list')) {
                this.renderInventory('inventory-list', branch);
            }
            return cars;
        } catch (e) { 
            console.error("Cloud fetch failed:", e);
            return this.getCars();
        }
    },

    // 【云端上传】
    async pushToCloud(cars) {
        const url = `https://api.github.com/repos/${CLOUD_CONFIG.OWNER}/${CLOUD_CONFIG.REPO}/contents/${CLOUD_CONFIG.FILE}`;
        try {
            const getFile = await fetch(url, { headers: { 'Authorization': `token ${CLOUD_CONFIG.TOKEN}` } });
            let sha = "";
            if (getFile.ok) {
                const fileData = await getFile.json();
                sha = fileData.sha;
            }

            const content = btoa(unescape(encodeURIComponent(JSON.stringify(cars, null, 2))));
            await fetch(url, {
                method: 'PUT',
                headers: { 'Authorization': `token ${CLOUD_CONFIG.TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Update: ${new Date().toLocaleString()}`,
                    content: content,
                    sha: sha
                })
            });
        } catch (e) { console.error("Push failed:", e); }
    },

    getCars() { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CARS)) || []; },
    saveCars(cars) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.CARS, JSON.stringify(cars));
        this.pushToCloud(cars); 
    },
    getStatusColor(status) {
        const colors = { 'ready': 'success', 'preparing': 'warning', 'booked': 'danger' };
        return colors[status] || 'secondary';
    },
    isAdmin() {
        const session = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION));
        return session && session.isLoggedIn && Date.now() < session.expiryTime;
    },

    renderInventory(containerId, branchFilter = 'all', searchQuery = '', statusFilter = 'all') {
        const container = document.getElementById(containerId);
        if (!container) return;
        let cars = this.getCars();

        if (branchFilter !== 'all') cars = cars.filter(c => c.branch === branchFilter);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            cars = cars.filter(c => c.brand.toLowerCase().includes(q) || c.model.toLowerCase().includes(q) || (c.plate && c.plate.toLowerCase().includes(q)));
        }
        if (statusFilter !== 'all') cars = cars.filter(c => c.status === statusFilter);

        if (cars.length === 0) {
            container.innerHTML = `<div class="col-12 text-center py-5 text-muted">No Vehicles Found.</div>`;
            return;
        }

        container.innerHTML = cars.map((car, index) => {
            const otr = parseFloat(car.price || 0) + parseFloat(car.proc_fee || 0);
            return `
            <div class="col-md-6 col-xl-4 mb-4">
                <div class="glass-card h-100 position-relative shadow-sm rounded-4 overflow-hidden" style="background:white;">
                    <span class="badge position-absolute top-0 start-0 m-3 bg-${this.getStatusColor(car.status)}">${car.status.toUpperCase()}</span>
                    <img src="${car.image || 'https://via.placeholder.com/400x250'}" class="card-img-top" style="height:180px; object-fit:cover;">
                    <div class="card-body p-3">
                        <h5 class="fw-bold mb-0">${car.brand} ${car.model}</h5>
                        <p class="text-primary small mb-2">${car.spec || '-'}</p>
                        <div class="bg-light p-2 rounded mb-3">
                            <div class="d-flex justify-content-between text-danger fw-bold"><span>OTR:</span><span>RM ${otr.toLocaleString()}</span></div>
                        </div>
                        <a href="calculator.html?price=${otr}" class="btn btn-primary btn-sm w-100 rounded-pill">Calculator</a>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
};

// 只有在非首页的情况下自动运行，避免首页双重运行
if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
    dataManager.fetchCloudData();
}
