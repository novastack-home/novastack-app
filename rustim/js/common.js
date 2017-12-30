$(document).ready(function() {
	
	$(window).load(function(){
		$(".loader_inner").fadeOut();
		$(".loader").delay(400).fadeOut("slow");
	})

	$(".toggle_mnu").click(function() {
		$(".sandwich").toggleClass("active");
	});
	
	$(".toggle_mnu").click(function() {
		if ($(".top_mnu").is(":visible")) {
			$(".top_text").removeClass("h_opacity");
			$(".top_mnu").fadeOut(600);
			$(".top_mnu li a").removeClass("fadeInUp animated");
		} else {
			$(".top_text").addClass("h_opacity");
			$(".top_mnu").fadeIn(600);
			$(".top_mnu li a").addClass("fadeInUp animated");
		};
	});

	$(".top_mnu li a").click(function() {
		$(".top_text").removeClass("h_opacity");
		$(".top_mnu li a").removeClass("fadeInUp animated");
		$(".top_mnu").fadeOut(600);
		$(".sandwich").toggleClass("active");
	});

	$(".top_mnu li a").mPageScroll2id();

	$(".top_text h1").animated("fadeInDown", "fadeOutUp");
	$(".top_text p, .section_header").animated("fadeInUp", "fadeOutDown");

	$(".popup").magnificPopup({type:"image"});

	$(".animation_flip").animated("flipInY","fadeOutY");
	$(".animation_left").animated("fadeInLeft","fadeOutLeft");
	$(".animation_right").animated("fadeInRight","fadeOutRight");

	$("#portfolio_grid").mixItUp();

	$(".s_portfolio li").click(function() {
		$(".s_portfolio li").removeClass("active");
		$(this).addClass("active");
	});

	
	$(".popup").magnificPopup({type:"image"});
	$(".popup_content").magnificPopup({
		type:"inline",
		CloseOnContentClick: true
	});

	$(".portfolio_item").each(function(i) {
		$(this).find("a").attr("href", "#work_"+i);
		$(this).find(".port_descr").attr("id", "work_"+i);
	});

	$("input,select,textarea").not("[type=submit]").jqBootstrapValidation();

});

