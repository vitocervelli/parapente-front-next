export const site = {
  name: "Parapente Bella Vista",
  tagline: "Volar es un sueño que solo vivirás aquí",
  whatsapp: "+58 414 8003636",
  instagram: "parapentebellavista",
  heroVideoUrl: "https://cdn.pixabay.com/video/2020/01/12/31179-384523315_large.mp4",
  reels: ["/uploads/IMG_4910.MP4", "/uploads/IMG_4910.MP4", "/uploads/IMG_4910.MP4"],
};

export const waDigits = site.whatsapp.replace(/\D/g, "");
export const waUrl = `https://wa.me/${waDigits}`;
export const igUrl = `https://www.instagram.com/${site.instagram}`;
export const igAt = `@${site.instagram}`;
