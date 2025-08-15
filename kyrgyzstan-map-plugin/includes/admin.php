<?php
// Register taxonomy for hierarchy (regions > districts)
function kmap_register_taxonomy() {
    register_taxonomy('kmap_hierarchy', 'kmap_ayyl_aymak', [
        'hierarchical' => true,
        'label' => 'Hierarchy',
        'show_ui' => true,
        'show_in_menu' => true,
        'rewrite' => false,
    ]);
}
add_action('init', 'kmap_register_taxonomy');

// Register custom post type for ayyl aymak data
function kmap_register_cpt() {
    $args = [
        'public' => true,
        'label' => 'Ayyl Aymak Data',
        'supports' => ['title', 'custom-fields'],
        'show_in_menu' => true,
        'menu_icon' => 'dashicons-location-alt',
        'taxonomies' => ['kmap_hierarchy'],
    ];
    register_post_type('kmap_ayyl_aymak', $args);
}
add_action('init', 'kmap_register_cpt');

// Add meta boxes for data entry
function kmap_add_meta_boxes() {
    add_meta_box('kmap_data', 'Ayyl Aymak Statistics', 'kmap_meta_box_callback', 'kmap_ayyl_aymak', 'normal', 'high');
}
add_action('add_meta_boxes', 'kmap_add_meta_boxes');

function kmap_meta_box_callback($post) {
    wp_nonce_field('kmap_save_data', 'kmap_nonce');
    $industries = [
        'agriculture' => 'Сельское хозяйство',
        'processing' => 'Перерабатывающая промышленность',
        'transport' => 'Транспорт и логистика',
        'construction' => 'Строительство и инфраструктура',
        'industry' => 'Промышленность',
        'energy' => 'Энергетика и ВИЭ',
        'education' => 'Образование',
        'healthcare' => 'Здравоохранение'
    ];
    $fields = [
        'leasing_amount' => 'Сумма лизинга (млн сом)',
        'equipment_quantity' => 'Количество техники',
        'new_jobs' => 'Новые рабочие места'
    ];
    
    echo '<table class="form-table">';
    echo '<tr><th><label for="code">Код территории</label></th><td><input type="text" name="code" value="' . esc_attr(get_post_meta($post->ID, 'code', true)) . '" class="regular-text"></td></tr>';
    
    foreach ($industries as $key => $name) {
        echo '<tr><th colspan="2"><h3>' . esc_html($name) . '</h3></th></tr>';
        foreach ($fields as $field_key => $field_name) {
            $value = get_post_meta($post->ID, "{$key}_{$field_key}", true);
            echo '<tr>';
            echo '<th><label for="' . esc_attr($key . '_' . $field_key) . '">' . esc_html($field_name) . '</label></th>';
            echo '<td><input type="number" step="0.01" name="' . esc_attr($key . '_' . $field_key) . '" value="' . esc_attr($value) . '" class="regular-text"></td>';
            echo '</tr>';
        }
    }
    echo '</table>';
}

function kmap_save_data($post_id) {
    if (!isset($_POST['kmap_nonce']) || !wp_verify_nonce($_POST['kmap_nonce'], 'kmap_save_data')) {
        return;
    }
    $fields = ['code'];
    $industries = ['agriculture', 'processing', 'transport', 'construction', 'industry', 'energy', 'education', 'healthcare'];
    $metrics = ['leasing_amount', 'equipment_quantity', 'new_jobs'];
    
    foreach ($fields as $field) {
        if (isset($_POST[$field])) {
            update_post_meta($post_id, $field, sanitize_text_field($_POST[$field]));
        }
    }
    foreach ($industries as $industry) {
        foreach ($metrics as $metric) {
            $key = "{$industry}_{$metric}";
            if (isset($_POST[$key])) {
                update_post_meta($post_id, $key, floatval($_POST[$key]));
            }
        }
    }
}
add_action('save_post', 'kmap_save_data');