$(document).ready(function(){                         
  if ($.cookie('preloader')) {         
      $('#loader-wrapper').hide();         
      $('.wrapper').show();         
  } 
  else 
  {         
     $(window).on('load', function () {   
         $('#loader-wrapper').fadeOut(1000);                           
      });       
      $('.wrapper').show();
      $.cookie('preloader', true, {         
          path: '/',         
          expire: 1         
      });         
   }                                                                           
});  
	//Match title height
function MatchHeight1() {
  $('.match')
    .matchHeight({})
  ;
}
//Functions that run when all HTML is loaded
$(document).ready(function() {
  MatchHeight1(); 
});
$(document).resize(function() {
  MatchHeight1(); 
});



// $(window).scroll(function(){
//   if ($(window).scrollTop() >= 150) {
//   $('.header').addClass('sticky');
//   }
//   else {
//   $('.header').removeClass('sticky');
//   }
//   });




jQuery(document).ready(function($) {
  $('.banner-slider').slick({
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 1000,
    arrows: false,
 
});
});






$("#test").on('click', function() {
  
  $.fancybox.open({
    src  : '#hidden-content',
    type : 'inline',
    opts : {
      afterShow : function( instance, current ) {
        console.info('done!');
      }
    }
  });
  
});


$('#tabs-nav li:first-child').addClass('active');
$('.tab-content').hide();
$('.tab-content:first').show();

// Click function
$('#tabs-nav li').click(function(){
  $('#tabs-nav li').removeClass('active');
  $(this).addClass('active');
  $('.tab-content').hide();
  
  var activeTab = $(this).find('a').attr('href');
  $(activeTab).fadeIn();
  return false;
});



$(document).ready(function() {
  var table = $('#dttable').DataTable({ 
        select: false,
        "columnDefs": [{
            className: "Name", 
            "targets":[0],
            "visible": false,
            "searchable":false
        }]
    });//End of create main table

  $('#example tbody').on( 'click', 'tr', function () {  
    alert(table.row( this ).data()[0]);

});
});








