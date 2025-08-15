<?php
function kmap_get_stats($level, $name, $code) {
    $industries = ['agriculture', 'processing', 'transport', 'construction', 'industry', 'energy', 'education', 'healthcare'];
    $metrics = ['leasing_amount', 'equipment_quantity', 'new_jobs'];
    $stats = [];
    
    foreach ($industries as $industry) {
        $stats[$industry] = [];
        foreach ($metrics as $metric) {
            $stats[$industry][$metric] = 0;
        }
    }
    
    $args = [
        'post_type' => 'kmap_ayyl_aymak',
        'posts_per_page' => -1,
        'meta_query' => []
    ];
    
    if ($level === 'country') {
        // No additional query args
    } elseif ($level === 'region') {
        $args['tax_query'] = [['taxonomy' => 'kmap_hierarchy', 'field' => 'name', 'terms' => $name]];
    } elseif ($level === 'district') {
        $args['tax_query'] = [['taxonomy' => 'kmap_hierarchy', 'field' => 'name', 'terms' => $name]];
    } elseif ($level === 'ayyl_aymak') {
        $args['meta_query'][] = ['key' => 'code', 'value' => $code];
    }
    
    $query = new WP_Query($args);
    while ($query->have_posts()) {
        $query->the_post();
        foreach ($industries as $industry) {
            foreach ($metrics as $metric) {
                $value = floatval(get_post_meta(get_the_ID(), "{$industry}_{$metric}", true));
                $stats[$industry][$metric] += $value;
            }
        }
    }
    wp_reset_postdata();
    
    return $stats;
}

function kmap_get_ayyl_aymaks_by_district($district) {
    $ayyl_aymaks = [];
    $args = [
        'post_type' => 'kmap_ayyl_aymak',
        'posts_per_page' => -1,
        'tax_query' => [['taxonomy' => 'kmap_hierarchy', 'field' => 'name', 'terms' => $district]],
    ];
    $query = new WP_Query($args);
    while ($query->have_posts()) {
        $query->the_post();
        $ayyl_aymaks[] = [
            'name' => get_the_title(),
            'code' => get_post_meta(get_the_ID(), 'code', true),
            'stats' => kmap_get_stats('ayyl_aymak', get_the_title(), get_post_meta(get_the_ID(), 'code', true)),
        ];
    }
    wp_reset_postdata();
    return $ayyl_aymaks;
}