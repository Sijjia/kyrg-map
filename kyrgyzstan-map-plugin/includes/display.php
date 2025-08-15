<?php
function kmap_display_map() {
    ob_start();
    ?>
    <div class="flex h-screen">
        <div id="map" class="w-3/4 h-full"></div>
        <div id="stats" class="w-1/4 bg-gray-100 p-4 overflow-y-auto text-white" style="background-color: #022068;">
            <h2 id="stats-title" class="text-xl font-bold mb-4">Статистика</h2>
            <div id="stats-content"></div>
            <div id="ayyl-list" class="mt-4"></div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}