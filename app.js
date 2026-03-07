
(function () {
    'use strict';

    // 全局状态
    let state = {
        isCollapsed: false,
        isEditMode: false,
        currentTab: 'video', // 'video' or 'music'
        videos: [],
        musics: [],
        currentPick: null,
        selectedItems: new Set()
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
        mainListPanel: document.getElementById('main-list-panel'),
        listWrapper: document.getElementById('list-wrapper'),
        collapseIcon: document.getElementById('collapse-icon'),
        panelHeader: document.getElementById('panel-header'),
        listTitle: document.getElementById('global-list-title'),
        actionBar: document.getElementById('action-bar'),
        renderTarget: document.getElementById('list-render-target'),
        editFooter: document.getElementById('edit-footer'),
        musicOverlay: document.getElementById('music-overlay'),
        // Tab
        tabVideo: document.getElementById('tab-video'),
        tabMusic: document.getElementById('tab-music'),
        tabIndicator: document.getElementById('tab-indicator'),
        // 弹窗
        addModal: document.getElementById('add-modal'),
        addUrlInput: document.getElementById('add-url'),
        deleteToast: document.getElementById('delete-toast'),
        deleteDialog: document.getElementById('delete-dialog'),
        // 按钮
        pickButton: document.getElementById('btn-pick'),
        confirmAddButton: document.getElementById('btn-confirm-add'),
        deleteConfirmButton: document.getElementById('btn-delete-confirm'),
        deleteCancelButton: document.getElementById('btn-delete-cancel'),
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
    }

    function setupEventListeners() {
        dom.pickButton.addEventListener('click', pickRandom);
        dom.panelHeader.addEventListener('click', toggleCollapse);
        dom.tabVideo.addEventListener('click', () => switchTab('video'));
        dom.tabMusic.addEventListener('click', () => switchTab('music'));
        dom.confirmAddButton.addEventListener('click', handleAddConfirm);
        dom.deleteConfirmButton.addEventListener('click', confirmDelete);
        dom.deleteCancelButton.addEventListener('click', hideDeleteConfirm);
        dom.deleteToast.addEventListener('click', (e) => {
            if (e.target === dom.deleteToast) hideDeleteConfirm();
        });
    }

    // -- 状态管理 --
    function loadState() {
        try {
            const storedVideos = localStorage.getItem(STORAGE_KEYS.videos);
            if (storedVideos) {
                state.videos = JSON.parse(storedVideos);
            } else if (window.RECOMMENDED_VIDEOS) {
                state.videos = window.RECOMMENDED_VIDEOS.map((v, i) => ({
                    ...v,
                    id: `video-${Date.now()}-${i}`,
                    source: getSourceFromUrl(v.url)
                }));
                saveState();
            }

            const storedMusics = localStorage.getItem(STORAGE_KEYS.musics);
            state.musics = storedMusics ? JSON.parse(storedMusics) : getMockData('musics');
        } catch (e) {
            console.error("Failed to load state:", e);
            state.videos = getMockData('videos');
            state.musics = getMockData('musics');
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEYS.videos, JSON.stringify(state.videos));
            localStorage.setItem(STORAGE_KEYS.musics, JSON.stringify(state.musics));
        } catch (e) {
            console.error("Failed to save state:", e);
        }
    }

    // -- 渲染逻辑 --
    function renderAll() {
        renderActionBar();
        renderList();
        renderPick();
        renderEditFooter();
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
                    <input type="checkbox" id="selectAll" class="bg-transparent border-white/20" onchange="window.app.toggleSelectAll(this.checked)" title="全选所有项目" aria-label="全选所有项目">
                    <label for="selectAll" class="cursor-pointer select-none">全选</label>
                </div>
                <button class="icon-btn text-[#A794D4]" onclick="window.app.toggleEditMode()" aria-label="完成编辑" title="完成编辑">
                    <i data-lucide="check" class="w-4 h-4 text-[#A794D4]" aria-hidden="true"></i>
                </button>
            `;
        } else {
            html = `
                <div class="flex items-center gap-2">
                    <button class="icon-btn" onclick="window.app.openSharePage()" aria-label="分享列表" title="分享列表">
                        <i data-lucide="share-2" class="w-4 h-4" aria-hidden="true"></i>
                    </button>
                    <button class="icon-btn" onclick="window.app.openImportExportPage()" aria-label="导入与导出" title="导入与导出">
                        <i data-lucide="hard-drive" class="w-4 h-4" aria-hidden="true"></i>
                    </button>
                    <button class="icon-btn" onclick="window.app.toggleAddModal()" aria-label="添加内容" title="添加内容">
                        <i data-lucide="plus" class="w-4 h-4" aria-hidden="true"></i>
                    </button>
                </div>
                <button class="icon-btn" onclick="window.app.toggleEditMode()" aria-label="编辑或管理列表" title="编辑或管理列表">
                    <i data-lucide="list-checks" class="w-4 h-4" aria-hidden="true"></i>
                </button>
            `;
        }
        dom.actionBar.innerHTML = html;
        lucide.createIcons();
    }

    function renderVideoList() {
        let html = `<div class="space-y-1 mt-1" id="sortable-video-list">`;
        state.videos.forEach((video, index) => {
            const isSelected = state.selectedItems.has(video.id);
            html += `
                <div class="sortable-item group flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors border ${isSelected ? 'border-white/20 bg-white/5' : 'border-transparent'}"
                     data-id="${video.id}" data-index="${index}" ${state.isEditMode ? 'draggable="true"' : ''} 
                     onclick="window.app.handleItemClick(event, '${video.id}')" role="button" tabindex="0">
                    
                    ${state.isEditMode ? `<input type="checkbox" ${isSelected ? 'checked' : ''} class="ml-1 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0 pointer-events-none">` : ''}
                    
                    <div class="relative w-[72px] aspect-[16/10] bg-black/50 rounded flex-shrink-0 ml-1 pointer-events-none">
                        <img src="${video.cover || ''}" alt="${video.title} 封面" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                    </div>
                    
                    <div class="flex-1 min-w-0 flex flex-col justify-center py-1 pointer-events-none">
                        <h4 class="text-[13px] text-white/90 group-hover:text-white truncate leading-snug">${video.title}</h4>
                        <span class="text-[11px] text-white/40 mt-1">${video.source}</span>
                    </div>
                    
                    ${state.isEditMode ? `
                        <button class="px-2 text-white/30 hover:text-white/80 transition-colors cursor-grab drag-handle" aria-label="按住拖动以排序此视频">
                            <i data-lucide="menu" class="w-4 h-4 pointer-events-none" aria-hidden="true"></i>
                        </button>
                    ` : ''}
                </div>
            `;
        });
        html += `</div>`;
        dom.renderTarget.innerHTML = html;
        if (state.isEditMode) bindDragEvents();
    }

    function renderMusicList() {
        // ... (与旧版类似，暂不详细实现)
        dom.renderTarget.innerHTML = '<div class="p-4 text-center text-white/50">音乐功能正在建设中...</div>';
    }

    function renderEditFooter() {
        dom.editFooter.classList.toggle('hidden', !state.isEditMode);
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
        dom.mainListPanel.classList.toggle('h-full', !state.isCollapsed);
        dom.listWrapper.classList.toggle('is-collapsed', state.isCollapsed);
        dom.collapseIcon.style.transform = state.isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        dom.panelHeader.setAttribute('aria-expanded', !state.isCollapsed);
    }

    function toggleEditMode() {
        state.isEditMode = !state.isEditMode;
        if (!state.isEditMode) {
            state.selectedItems.clear();
        }
        renderAll();
    }

    function switchTab(tab) {
        state.currentTab = tab;
        state.isEditMode = false;
        state.selectedItems.clear();

        const isVideo = tab === 'video';
        dom.tabVideo.classList.toggle('text-white/90', isVideo);
        dom.tabVideo.classList.toggle('text-white/40', !isVideo);
        dom.tabMusic.classList.toggle('text-white/90', !isVideo);
        dom.tabMusic.classList.toggle('text-white/40', isVideo);
        dom.tabVideo.setAttribute('aria-selected', isVideo);
        dom.tabMusic.setAttribute('aria-selected', !isVideo);
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
        const url = dom.addUrlInput.value.trim();
        if (!url) return;

        const btn = dom.confirmAddButton;
        btn.classList.add('loading-state');
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>';
        lucide.createIcons();

        try {
            let videoData;
            if (url.includes('bilibili.com') || url.includes('b23.tv')) {
                const bvid = url.match(/BV[a-zA-Z0-9]+/)[0];
                const response = await fetch(`https://bilicover.magecorn.com/get/${bvid}`);
                const data = await response.json();
                videoData = {
                    title: data.title,
                    url: `https://www.bilibili.com/video/${bvid}`,
                    cover: data.cover,
                    source: 'Bilibili'
                };
            } else {
                // For YouTube or other sources, you might need a different API or a backend proxy
                throw new Error('Unsupported URL type for now.');
            }

            const newItem = {
                id: `video-${Date.now()}`,
                ...videoData
            };

            state.videos.unshift(newItem);
            saveState();
            renderList();
            toggleAddModal();
        } catch (error) {
            console.error('Failed to fetch video metadata:', error);
            alert('获取视频信息失败，请检查链接或稍后再试。');
        } finally {
            btn.classList.remove('loading-state');
            btn.innerHTML = '添加';
            dom.addUrlInput.value = '';
        }
    }

    function handleItemClick(event, id) {
        if (state.isEditMode) {
            if (state.selectedItems.has(id)) {
                state.selectedItems.delete(id);
            } else {
                state.selectedItems.add(id);
            }
            renderList();
        } else {
            const item = state.videos.find(v => v.id === id);
            if (item) {
                state.currentPick = item;
                renderPick();
            }
        }
    }

    function toggleSelectAll(checked) {
        if (checked) {
            state.videos.forEach(v => state.selectedItems.add(v.id));
        } else {
            state.selectedItems.clear();
        }
        renderList();
    }

    function showDeleteConfirm() {
        if (state.selectedItems.size === 0) return;
        dom.deleteToast.classList.remove('opacity-0', 'pointer-events-none');
        dom.deleteDialog.classList.remove('scale-95');
    }

    function hideDeleteConfirm() {
        dom.deleteToast.classList.add('opacity-0', 'pointer-events-none');
        dom.deleteDialog.classList.add('scale-95');
    }

    function confirmDelete() {
        state.videos = state.videos.filter(v => !state.selectedItems.has(v.id));
        state.selectedItems.clear();
        saveState();
        hideDeleteConfirm();
        renderAll();
    }

    function openSharePage() {
        // ...
    }

    function openImportExportPage() {
        const rawText = state.videos.map(v => `${v.title} ${v.url}`).join('\n');
        const htmlContent = `...`; // (与你提供的 HTML 类似)
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }

    // -- 辅助函数 --
    function getSourceFromUrl(url) {
        if (url.includes('bilibili.com')) return 'Bilibili';
        if (url.includes('youtube.com')) return 'YouTube';
        return 'Unknown';
    }

    function getMockData(type) { /* ... */ return []; }

    // -- 拖拽排序 --
    let dragStartIndex = null;
    function bindDragEvents() {
        const list = document.getElementById('sortable-video-list');
        if (!list) return;
        
        const items = list.querySelectorAll('.sortable-item');

        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                dragStartIndex = parseInt(item.getAttribute('data-index'));
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => item.classList.add('dragging'), 0);
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                item.classList.add('drag-over-target');
            });

            item.addEventListener('dragleave', (e) => {
                item.classList.remove('drag-over-target');
            });

            item.addEventListener('drop', (e) => {
                e.stopPropagation();
                item.classList.remove('drag-over-target');
                
                const dropTargetIndex = parseInt(item.getAttribute('data-index'));
                
                if (dragStartIndex !== null && dragStartIndex !== dropTargetIndex) {
                    const draggedItem = state.videos.splice(dragStartIndex, 1)[0];
                    state.videos.splice(dropTargetIndex, 0, draggedItem);
                    saveState();
                    renderList();
                }
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                dragStartIndex = null;
            });
        });
    }

    // -- 暴露到全局 --
    window.app = {
        toggleCollapse,
        toggleEditMode,
        switchTab,
        toggleAddModal,
        handleItemClick,
        toggleSelectAll,
        showDeleteConfirm,
        hideDeleteConfirm,
        confirmDelete,
        openSharePage,
        openImportExportPage
    };

    // -- DOMContentLoaded --
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
