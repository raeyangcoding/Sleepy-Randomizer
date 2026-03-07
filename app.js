
(function () {
    'use strict';

    // 全局状态
    let state = {
        isCollapsed: false,
        isEditMode: false,
        currentTab: 'video', // 'video' or 'music'
        videos: [],
        musics: [],
        currentPick: null
    };

    // DOM 元素缓存
    const dom = {
        // 主播放器
        randomPlaceholder: document.getElementById('random-placeholder'),
        randomContent: document.getElementById('random-content'),
        randomCover: document.getElementById('random-cover'),
        randomTitle: document.getElementById('random-title'),
        randomSource: document.getElementById('random-source'),
        randomLink: document.getElementById('random-link'),
        // 列表面板
        listWrapper: document.getElementById('list-wrapper'),
        collapseIcon: document.getElementById('collapse-icon'),
        panelHeader: document.getElementById('panel-header'),
        listTitle: document.getElementById('global-list-title'),
        actionBar: document.getElementById('action-bar'),
        renderTarget: document.getElementById('list-render-target'),
        musicOverlay: document.getElementById('music-overlay'),
        // Tab
        tabVideo: document.getElementById('tab-video'),
        tabMusic: document.getElementById('tab-music'),
        tabIndicator: document.getElementById('tab-indicator'),
        // 弹窗
        addModal: document.getElementById('add-modal'),
        addUrlInput: document.getElementById('add-url'),
        // 按钮
        pickButton: document.getElementById('btn-pick'),
        confirmAddButton: document.getElementById('btn-confirm-add')
    };

    const STORAGE_KEYS = {
        videos: 'sleepy-randomizer-videos',
        musics: 'sleepy-randomizer-musics'
    };

    const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

    // -- 初始化 --
    function init() {
        loadState();
        setupEventListeners();
        renderAll();
        lucide.createIcons();
    }

    function setupEventListeners() {
        dom.pickButton.addEventListener('click', pickRandom);
        dom.panelHeader.addEventListener('click', toggleCollapse);
        dom.tabVideo.addEventListener('click', () => switchTab('video'));
        dom.tabMusic.addEventListener('click', () => switchTab('music'));
        dom.confirmAddButton.addEventListener('click', handleAddConfirm);
    }

    // -- 状态管理 --
    function loadState() {
        try {
            const storedVideos = localStorage.getItem(STORAGE_KEYS.videos);
            const storedMusics = localStorage.getItem(STORAGE_KEYS.musics);

            state.videos = storedVideos ? JSON.parse(storedVideos) : getMockData('videos');
            state.musics = storedMusics ? JSON.parse(storedMusics) : getMockData('musics');
        } catch (e) {
            console.error("Failed to load state from localStorage:", e);
            state.videos = getMockData('videos');
            state.musics = getMockData('musics');
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEYS.videos, JSON.stringify(state.videos));
            localStorage.setItem(STORAGE_KEYS.musics, JSON.stringify(state.musics));
        } catch (e) {
            console.error("Failed to save state to localStorage:", e);
        }
    }

    // -- 渲染逻辑 --
    function renderAll() {
        renderActionBar();
        renderList();
        renderPick();
        lucide.createIcons();
    }

    function renderPick() {
        if (state.currentPick) {
            dom.randomPlaceholder.classList.add('hidden');
            dom.randomContent.classList.remove('hidden');
            dom.randomContent.classList.add('flex');

            dom.randomCover.src = state.currentPick.cover;
            dom.randomTitle.textContent = state.currentPick.title;
            dom.randomSource.textContent = state.currentPick.source;
            dom.randomLink.href = state.currentPick.url;
        } else {
            dom.randomPlaceholder.classList.remove('hidden');
            dom.randomContent.classList.add('hidden');
            dom.randomContent.classList.remove('flex');
        }
    }

    function renderList() {
        if (state.currentTab === 'video') {
            renderVideoList();
        } else {
            renderMusicList();
        }
    }

    function renderActionBar() {
        let html;
        if (state.isEditMode) {
            html = `
                <div class="flex items-center gap-3 px-1 text-sm text-white/80">
                    <input type="checkbox" id="selectAll" class="bg-transparent border-white/20">
                    <label for="selectAll" class="cursor-pointer select-none">全选</label>
                </div>
                <button class="icon-btn text-[#A794D4]" onclick="window.app.toggleEditMode()" aria-label="完成" title="完成">
                    <i data-lucide="check" class="w-4 h-4 text-[#A794D4]" aria-hidden="true"></i>
                </button>
            `;
        } else {
            html = `
                <div class="flex items-center gap-2">
                    <button class="icon-btn" aria-label="分享列表" title="分享列表">
                        <i data-lucide="share-2" class="w-4 h-4" aria-hidden="true"></i>
                    </button>
                    <button class="icon-btn" onclick="window.app.toggleAddModal()" aria-label="添加内容" title="添加内容">
                        <i data-lucide="plus" class="w-4 h-4" aria-hidden="true"></i>
                    </button>
                </div>
                <button class="icon-btn" onclick="window.app.toggleEditMode()" aria-label="管理列表" title="管理列表">
                    <i data-lucide="list-checks" class="w-4 h-4" aria-hidden="true"></i>
                </button>
            `;
        }
        dom.actionBar.innerHTML = html;
        lucide.createIcons();
    }

    function renderVideoList() {
        let html = `<div class="space-y-1 mt-1">`;
        state.videos.forEach(video => {
            html += `
                <div class="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent">
                    ${state.isEditMode ? `<input type="checkbox" data-id="${video.id}" class="ml-1 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0">` : ''}
                    <div class="relative w-[72px] aspect-[16/10] bg-black/50 rounded flex-shrink-0 ml-1">
                        <img src="${video.cover}" alt="${video.title} 的封面" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                    </div>
                    <div class="flex-1 min-w-0 flex flex-col justify-center py-1">
                        <h4 class="text-[13px] text-white/90 group-hover:text-white truncate leading-snug">${video.title}</h4>
                        <span class="text-[11px] text-white/40 mt-1">${video.source}</span>
                    </div>
                    ${state.isEditMode ? `
                        <button class="px-2 text-white/30 hover:text-white/80 transition-colors cursor-grab" aria-label="拖拽排序">
                            <i data-lucide="menu" class="w-4 h-4" aria-hidden="true"></i>
                        </button>
                    ` : ''}
                </div>
            `;
        });
        html += `</div>`;
        dom.renderTarget.innerHTML = html;
        lucide.createIcons();
    }

    function renderMusicList() {
        let html = `<div class="space-y-0.5 px-1 pb-4 mt-2">`;
        state.musics.forEach(track => {
            html += `
                <div class="group grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_44px] items-center gap-4 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="relative w-10 h-10 flex-shrink-0">
                            <img src="${track.cover}" alt="${track.album} 的专辑封面" class="w-full h-full rounded shadow-sm opacity-80 group-hover:opacity-100 transition-opacity object-cover">
                            <div class="absolute inset-0 bg-black/40 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <i data-lucide="play" class="w-4 h-4 text-white fill-white ml-0.5" aria-hidden="true"></i>
                            </div>
                        </div>
                        <div class="flex flex-col min-w-0">
                            <span class="text-[13px] text-white/90 group-hover:text-white truncate font-medium">${track.title}</span>
                            <span class="text-[11px] text-white/50 truncate group-hover:text-white/70 transition-colors mt-0.5">${track.artist}</span>
                        </div>
                    </div>
                    <div class="text-[12px] text-white/50 truncate group-hover:text-white/70 transition-colors">${track.album}</div>
                    <div class="text-[12px] text-white/40 font-mono text-right pr-2">${track.duration}</div>
                </div>
            `;
        });
        html += `</div>`;
        dom.renderTarget.innerHTML = html;
        lucide.createIcons();
    }

    // -- 交互逻辑 --
    function pickRandom() {
        const list = state.currentTab === 'video' ? state.videos : state.musics;
        if (list.length === 0) return;
        const randomIndex = Math.floor(Math.random() * list.length);
        state.currentPick = list[randomIndex];
        renderPick();
    }

    function toggleCollapse() {
        state.isCollapsed = !state.isCollapsed;
        dom.listWrapper.classList.toggle('is-collapsed', state.isCollapsed);
        dom.collapseIcon.style.transform = state.isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        dom.panelHeader.setAttribute('aria-expanded', !state.isCollapsed);
    }

    function toggleEditMode() {
        state.isEditMode = !state.isEditMode;
        renderAll();
    }

    function switchTab(tab) {
        state.currentTab = tab;
        state.isEditMode = false;

        const isVideo = tab === 'video';
        dom.tabVideo.classList.toggle('text-white/90', isVideo);
        dom.tabVideo.classList.toggle('text-white/40', !isVideo);
        dom.tabMusic.classList.toggle('text-white/90', !isVideo);
        dom.tabMusic.classList.toggle('text-white/40', isVideo);
        dom.tabIndicator.style.transform = isVideo ? 'translateX(0)' : 'translateX(72px)';
        dom.listTitle.innerText = isVideo ? '视频列表' : '音乐列表';
        dom.musicOverlay.classList.toggle('hidden', isVideo);
        dom.musicOverlay.classList.toggle('flex', !isVideo);

        if (state.isCollapsed) toggleCollapse();
        renderAll();
    }

    function toggleAddModal() {
        dom.addModal.classList.toggle('hidden');
        dom.addModal.classList.toggle('flex');
    }

    async function handleAddConfirm() {
        const url = dom.addUrlInput.value;
        if (!url) return;

        const parsed = parseUrl(url);
        if (!parsed) {
            alert('不支持的链接格式');
            return;
        }

        if (parsed.source === 'Bilibili' || parsed.source === 'YouTube') {
            if (state.currentTab !== 'video') switchTab('video');
            // 更多视频处理逻辑...
        } else if (parsed.source === 'Spotify') {
            if (state.currentTab !== 'music') switchTab('music');
            // 更多音乐处理逻辑...
        }

        toggleAddModal();
        dom.addUrlInput.value = '';
    }

    function parseUrl(url) {
        if (url.includes('bilibili.com') || url.includes('b23.tv')) {
            return { source: 'Bilibili', url };
        } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return { source: 'YouTube', url };
        } else if (url.includes('spotify.com')) {
            return { source: 'Spotify', url };
        }
        return null;
    }

    // -- Mock 数据 --
    function getMockData(type) {
        const coverPlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231f1d2e'/%3E%3Cpath d='M50 35v18.5a7.5 7.5 0 1 0 5 7V40h10v-5H50z' fill='%233a3653'/%3E%3C/svg%3E";
        if (type === 'videos') {
            return [
                { id: 1, type: "single", title: "口风琴+气垫=？", source: "Bilibili", cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100&q=80", url: "#" },
                { id: 2, type: "single", title: "谁说哈士奇不怕冷的？站出来，我家你怎么解释！", source: "Bilibili", cover: "https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=100&q=80", url: "#" },
                { id: 3, type: "single", title: "沉浸式太空漫游：木星之声", source: "YouTube", cover: "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=100&q=80", url: "#" }
            ];
        }
        if (type === 'musics') {
            return [
                { id: 1, title: "Moon River", artist: "小野リサ", album: "Ono Lisa Best 1997-2001", duration: "04:23", cover: coverPlaceholder, url: "#" },
                { id: 2, title: "SAY...GOOD NIGHT", artist: "角松敏生", album: "ON THE CITY SHORE", duration: "01:07", cover: coverPlaceholder, url: "#" },
                { id: 3, title: "At The End Of The Day (Grace)", artist: "Quincy Jones", album: "Q's Jock Joint", duration: "07:42", cover: coverPlaceholder, url: "#" },
                { id: 4, title: "GOOD-NIGHT FOR YOU", artist: "杏里", album: "Timely!!", duration: "05:20", cover: coverPlaceholder, url: "#" }
            ];
        }
        return [];
    }

    // -- 暴露到全局 --
    window.app = {
        toggleCollapse,
        toggleEditMode,
        switchTab,
        toggleAddModal
    };

    // -- DOMContentLoaded --
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
