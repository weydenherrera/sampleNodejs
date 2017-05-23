var Main = (function () {
	// variables
	var ctr = 0;

	// object
	return {
		init: function () {

			// Fix on bootstrap modal bug on #Overflow and scrolling
			// http://getbootstrap.com/getting-started/#support-fixed-position-keyboards
			$(".modal").on('shown.bs.modal', function (e) {
				var ctr = 0;
				$('.modal').each(function() {
					if ( $(this).is(':visible') ) {
						ctr+=1;
					}
				});
				if ( ctr >= 1 ) {
					$('body').addClass('modal-open');
				}
			});

		},

		//--------
		nocomma: null
	};
}());

// Init after the page has loaded
jQuery(Main.init);
