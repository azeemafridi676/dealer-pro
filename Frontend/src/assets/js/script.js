

// FAQ accordion functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('**************************************************');
  
});
// // Initialize ScrollTrigger
// gsap.registerPlugin(ScrollTrigger);

// // Newsletter truck animation
// gsap.from("#newsletter-truck", {
//   scrollTrigger: {
//       trigger: "#newsletter-truck",
//       start: "top 40%",
//       end: "bottom center", 
//       scrub: 1
//   },
//   x: "100%",
//   opacity: 0,
//   duration: 2,
//   ease: "power2.out"
// });

// // Brands section animations
// gsap.from("#brands-title", {
//   scrollTrigger: {
//       trigger: "#brands-title",
//       start: "top bottom",
//       end: "top center",
//       toggleActions: "play none none reverse"
//   },
//   y: 100,
//   opacity: 0,
//   duration: 1,
//   ease: "elastic.out(1, 0.3)"
// });

// gsap.from("#brands-list", {
//   scrollTrigger: {
//       trigger: "#brands-list",
//       start: "top bottom", 
//       end: "top center",
//       toggleActions: "play none none reverse"
//   },
//   y: 100,
//   opacity: 0,
//   duration: 1,
//   delay: 0.2,
//   ease: "elastic.out(1, 0.3)"
// });

// // Brands scroll animations
// gsap.to("#brands-title", {
//   scrollTrigger: {
//       trigger: "#brands-title",
//       start: "top center",
//       end: "bottom top",
//       scrub: 1
//   },
//   x: 200,
//   duration: 1,
//   ease: "none"
// });

// gsap.to("#brands-list", {
//   scrollTrigger: {
//       trigger: "#brands-list",
//       start: "top center",
//       end: "bottom top",
//       scrub: 1
//   },
//   x: -200,
//   duration: 1,
//   ease: "none"
// });

// // Feature boxes animations
// const featureBoxes = document.querySelectorAll('.feature-box');

// featureBoxes.forEach((box, index) => {
//   gsap.from(box, {
//       scrollTrigger: {
//           trigger: box,
//           start: "top bottom-=100",
//           end: "top center",
//           toggleActions: "play none none reverse"
//       },
//       y: 50,
//       opacity: 0,
//       duration: 0.8,
//       delay: index * 0.2,
//       ease: "power2.out"
//   });
// });



// // Hero Section Animations
// function initHeroAnimations() {
//   const tl = gsap.timeline({
//       defaults: { 
//           ease: "power4.out",
//           duration: 1.5
//       }
//   });

//   // Initial setup
//   gsap.set("#heroSpinner", { opacity: 0, scale: 0.5 });
//   gsap.set("#heroVan", { x: "-100vw" });
//   gsap.set("#videoContainer", { scale: 0, opacity: 0 });

//   // Animation sequence
//   tl.to("#heroSpinner", {
//       opacity: 1,
//       scale: 1,
//       duration: 1,
//       ease: "elastic.out(1, 0.5)"
//   })
//   .to("#heroVan", {
//       x: 0,
//       duration: 1.2,
//       ease: "power4.out"
//   }, "-=0.5")
//   .to("#videoContainer", {
//       scale: 1,
//       opacity: 1,
//       duration: 1,
//       ease: "back.out(1.7)"
//   }, "-=0.7");

//   gsap.utils.toArray(["#heroVan", "#videoContainer"]).forEach(element => {
//       element.addEventListener("mouseenter", () => {
//           gsap.to(element, {
//               scale: 1.05,
//               duration: 0.3,
//               ease: "power2.out"
//           });
//       });

//       element.addEventListener("mouseleave", () => {
//           gsap.to(element, {
//               scale: 1,
//               duration: 0.3,
//               ease: "power2.out"
//           });
//       });
//   });
// }

// // Call the animation function when the page loads
// window.addEventListener('load', initHeroAnimations);


//               // Scroll to Top Button Functionality
//               const scrollToTopBtn = document.getElementById("scrollToTop");
              
//               // Show button when scrolling down
//               window.addEventListener("scroll", () => {
//                   if (window.scrollY > 300) {
//                       scrollToTopBtn.style.opacity = "1";
//                       scrollToTopBtn.style.visibility = "visible";
//                   } else {
//                       scrollToTopBtn.style.opacity = "0";
//                       scrollToTopBtn.style.visibility = "hidden";
//                   }
//               });

//               // Smooth scroll to top when clicked
//               scrollToTopBtn.addEventListener("click", () => {
//                   window.scrollTo({
//                       top: 0,
//                       behavior: "smooth"
//                   });
//               });
         
              