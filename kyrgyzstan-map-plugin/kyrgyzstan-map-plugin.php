<?php
/*
Plugin Name: Kyrgyzstan Interactive Map
Description: Interactive map of Kyrgyzstan with statistics for regions and districts, ayyl aymaks in list.
Version: 1.2
Author: Your Name
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin paths
define('KMAP_PATH', plugin_dir_path(__FILE__));
define('KMAP_URL', plugin_dir_url(__FILE__));

// Include necessary files
require_once KMAP_PATH . 'includes/admin.php';
require_once KMAP_PATH . 'includes/data.php';
require_once KMAP_PATH . 'includes/display.php';

// Enqueue scripts and styles
function kmap_enqueue_assets() {
    wp_enqueue_script('leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', [], '1.9.4', true);
    wp_enqueue_style('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', [], '1.9.4');
    wp_enqueue_style('tailwind-css', 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css', [], '2.2.19');
    wp_enqueue_script('kmap-js', KMAP_URL . 'assets/js/map.js', ['leaflet-js'], '1.2', true);
    wp_enqueue_style('kmap-css', KMAP_URL . 'assets/css/style.css', [], '1.2');
    wp_localize_script('kmap-js', 'kmapData', [
        'ajaxurl' => admin_url('admin-ajax.php'),
        'mapUrl' => KMAP_URL . 'assets/svg/kyrgyzstan.svg'
    ]);
}
add_action('wp_enqueue_scripts', 'kmap_enqueue_assets');

// Register shortcode
add_shortcode('kyrgyzstan_map', 'kmap_display_map');

// AJAX handlers
add_action('wp_ajax_kmap_get_stats', 'kmap_get_stats_ajax');
function kmap_get_stats_ajax() {
    $level = sanitize_text_field($_GET['level']);
    $name = sanitize_text_field($_GET['name']);
    $code = sanitize_text_field($_GET['code']);
    $stats = kmap_get_stats($level, $name, $code);
    wp_send_json($stats);
}

add_action('wp_ajax_kmap_get_ayyl_aymaks', 'kmap_get_ayyl_aymaks_ajax');
function kmap_get_ayyl_aymaks_ajax() {
    $district = sanitize_text_field($_GET['district']);
    $ayyl_aymaks = kmap_get_ayyl_aymaks_by_district($district);
    wp_send_json($ayyl_aymaks);
}