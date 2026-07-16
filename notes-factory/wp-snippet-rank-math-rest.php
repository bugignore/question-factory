<?php
/**
 * Notes Factory — expose Rank Math's SEO fields to the WordPress REST API.
 *
 * WHY: WordPress REST only accepts post meta that is explicitly registered for
 * REST. Rank Math stores Focus Keyword / SEO Title / Meta Description in post
 * meta but does not register them, so the Notes Factory publishing workflow
 * cannot set them without this snippet. With it installed, every Rank Math
 * field arrives pre-filled the moment a draft is created — nothing to paste.
 *
 * INSTALL (pick ONE, one time):
 *   a) Plugins → Code Snippets (plugin) → Add New → paste everything below
 *      the opening <?php line → set to "Run everywhere" → Activate.  (easiest)
 *   b) Appearance → Theme File Editor → your CHILD theme's functions.php →
 *      paste at the end. (lost on theme change unless it's a child theme)
 *   c) Upload this whole file to wp-content/mu-plugins/  (survives everything)
 *
 * SECURITY: auth_callback requires edit_posts, so only logged-in editors/admins
 * (including the Application Password user) can write these fields. Public
 * REST responses expose them read-only, which is harmless — they are printed
 * in the page's <head> anyway.
 */
add_action( 'init', function () {
	$fields = array(
		'rank_math_focus_keyword', // Focus Keyword (comma-separate for multiple)
		'rank_math_title',         // SEO Title shown in search results
		'rank_math_description',   // Meta Description
	);
	foreach ( $fields as $field ) {
		register_post_meta( 'post', $field, array(
			'show_in_rest'  => true,
			'single'        => true,
			'type'          => 'string',
			'auth_callback' => function () {
				return current_user_can( 'edit_posts' );
			},
		) );
	}
} );
