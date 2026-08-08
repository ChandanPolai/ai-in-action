import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  WebsiteHero,
  WebsiteWorkshop,
  WebsiteSession,
  WebsiteTestimonial,
  WebsiteGallery
} from '../models/index.js';

dotenv.config();

const calcTotals = (offerPrice, gstPercent = 18) => {
  const p = Math.max(0, Number(offerPrice) || 0);
  const g = Math.max(0, Number(gstPercent) || 0);
  const gstAmount = Math.round(((p * g) / 100) * 100) / 100;
  const total = Math.round((p + gstAmount) * 100) / 100;
  return { offerPrice: p, gstPercent: g, gstAmount, total };
};

const day = (offset) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
};

const seedWebsiteData = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI missing in .env');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing website CMS content
  await Promise.all([
    WebsiteHero.deleteMany({}),
    WebsiteWorkshop.deleteMany({}),
    WebsiteSession.deleteMany({}),
    WebsiteTestimonial.deleteMany({}),
    WebsiteGallery.deleteMany({})
  ]);
  console.log('Cleared old website data');

  // ── Hero ─────────────────────────────────────────────────
  await WebsiteHero.create({
    title: 'AI In Action',
    description:
      '14 Years of Building Real Businesses. Now We Turn That Experience Into Your AI Advantage. What Are You Waiting For? Scroll Down. Automate Your Business. Move Fast.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
    isActive: true,
    videos: [
      {
        type: 'video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        file: '',
        title: 'Workshop Intro Reel'
      },
      {
        type: 'video',
        url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        file: '',
        title: 'Student Success Stories'
      }
    ],
    images: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
        file: '',
        title: 'Classroom session'
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
        file: '',
        title: 'Team collaboration'
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
        file: '',
        title: 'Workshop venue'
      }
    ]
  });
  console.log('✓ Hero seeded');

  // ── Workshops / Pricing ──────────────────────────────────
  const workshops = [
    {
      title: 'Early Bird — 14-Day AI Workshop',
      description: `
        <p><strong>Best for founders who want to move fast.</strong></p>
        <ul>
          <li>Full 14-day live workshop access</li>
          <li>Prompting + vibe coding fundamentals</li>
          <li>Build your first AI agent</li>
          <li>Community &amp; recordings access</li>
          <li>Certificate of completion</li>
        </ul>
        <p>Limited seats. Price locked for early birds only.</p>
      `,
      basePrice: 49999,
      ...calcTotals(24999, 18),
      image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80',
      sortOrder: 1,
      isActive: true
    },
    {
      title: 'VIP — Scale With Mentorship',
      description: `
        <p><strong>For serious operators who want hand-holding.</strong></p>
        <ul>
          <li>Everything in Early Bird</li>
          <li>1:1 mentor office hours (2 sessions)</li>
          <li>Priority doubt support on WhatsApp</li>
          <li>AI marketing &amp; sales playbook pack</li>
          <li>90-day execution blueprint review</li>
        </ul>
      `,
      basePrice: 79999,
      ...calcTotals(44999, 18),
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
      sortOrder: 2,
      isActive: true
    },
    {
      title: 'Elite — Build & Monetize AI Solutions',
      description: `
        <p><strong>For agencies &amp; consultants ready to sell AI.</strong></p>
        <ul>
          <li>Everything in VIP</li>
          <li>Build sellable AI solutions (day 13 deep dive)</li>
          <li>Client acquisition templates</li>
          <li>Private mastermind group (90 days)</li>
          <li>Lifetime recording access</li>
        </ul>
      `,
      basePrice: 129999,
      ...calcTotals(79999, 18),
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
      sortOrder: 3,
      isActive: true
    },
    {
      title: 'Corporate Batch (Team of 5)',
      description: `
        <p>Train your leadership / ops team together.</p>
        <ul>
          <li>5 seats included</li>
          <li>Custom use-case workshop slot</li>
          <li>Team ROI dashboard template</li>
        </ul>
      `,
      basePrice: 349999,
      ...calcTotals(199999, 18),
      image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
      sortOrder: 4,
      isActive: true
    }
  ];
  await WebsiteWorkshop.insertMany(workshops);
  console.log(`✓ ${workshops.length} workshops seeded`);

  // ── Sessions (14-day agenda style) ───────────────────────
  const sessionDefs = [
    { day: 1, session: 1, title: 'AI Foundations — Understand the Shift', desc: 'Why AI is rewriting business rules and how to think like an AI-first founder.', offset: 1, start: '10:00', end: '12:00' },
    { day: 1, session: 2, title: 'Opportunity Mapping Workshop', desc: 'Identify 5 AI opportunities inside your current business.', offset: 1, start: '14:00', end: '16:00' },
    { day: 2, session: 1, title: 'Prompting Mastery', desc: 'Write prompts that produce reliable, business-ready outputs.', offset: 2, start: '10:00', end: '12:30' },
    { day: 2, session: 2, title: 'Prompt Library Build', desc: 'Create your personal prompt stack for sales, support & content.', offset: 2, start: '14:00', end: '16:00' },
    { day: 3, session: 1, title: 'Vibe Coding Basics — Part 1', desc: 'Ship small tools without traditional coding background.', offset: 3, start: '10:00', end: '13:00' },
    { day: 4, session: 1, title: 'Vibe Coding Basics — Part 2', desc: 'Connect APIs, forms, and simple automations.', offset: 4, start: '10:00', end: '13:00' },
    { day: 5, session: 1, title: 'Build Your First AI Agent', desc: 'Design an agent that handles a real repetitive task.', offset: 5, start: '10:00', end: '13:00' },
    { day: 6, session: 1, title: 'Agent Memory & Tools', desc: 'Give your agent tools, context, and reliable workflows.', offset: 6, start: '10:00', end: '13:00' },
    { day: 7, session: 1, title: 'Deploy Your First Agent Live', desc: 'Go from prototype to something your team can use.', offset: 7, start: '10:00', end: '13:00' },
    { day: 8, session: 1, title: 'Sales Agent Deep Dive', desc: 'Automate lead qualification and follow-ups.', offset: 8, start: '10:00', end: '13:00' },
    { day: 9, session: 1, title: 'Support & Ops Agents', desc: 'Cut ticket load and ops chaos with AI employees.', offset: 9, start: '10:00', end: '13:00' },
    { day: 10, session: 1, title: 'Advanced Multi-Agent Systems', desc: 'Connect agents that work together across departments.', offset: 10, start: '10:00', end: '13:00' },
    { day: 11, session: 1, title: 'AI Marketing Engine', desc: 'Content, ads, and funnels powered by AI.', offset: 11, start: '10:00', end: '13:00' },
    { day: 12, session: 1, title: 'Content Machine at Scale', desc: 'Publish daily without burning your team out.', offset: 12, start: '10:00', end: '13:00' },
    { day: 13, session: 1, title: 'Monetize AI — Sellable Solutions', desc: 'Package what you built into client-ready offers.', offset: 13, start: '10:00', end: '13:00' },
    { day: 14, session: 1, title: '90-Day AI Execution Blueprint', desc: 'Your personal roadmap + closing ceremony.', offset: 14, start: '10:00', end: '13:00' }
  ];

  const sessionImages = [
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
    'https://images.unsplash.com/photo-1551434678-e076c223a692d?w=800&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'
  ];

  await WebsiteSession.insertMany(
    sessionDefs.map((s, i) => ({
      title: s.title,
      description: s.desc,
      image: sessionImages[i % sessionImages.length],
      dayNumber: s.day,
      sessionNumber: s.session,
      sessionDate: day(s.offset),
      startTime: s.start,
      endTime: s.end,
      sortOrder: i + 1,
      isActive: true
    }))
  );
  console.log(`✓ ${sessionDefs.length} sessions seeded`);

  // ── Testimonials ─────────────────────────────────────────
  const testimonials = [
    {
      name: 'Rahul Mehta',
      position: 'D2C Founder, Ahmedabad',
      description:
        'We cut 18 hours/week of manual follow-ups after building our first sales agent in week 2. This is not theory — they make you ship.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
      sortOrder: 1
    },
    {
      name: 'Priya Shah',
      position: 'CA & Business Consultant',
      description:
        'I finally understand how to productize AI for clients. The monetize module alone paid for the workshop.',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
      sortOrder: 2
    },
    {
      name: 'Amit Patel',
      position: 'E-commerce Operator, Surat',
      description:
        'Prompting mastery changed how our content team works. We now publish 5x more without hiring.',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
      sortOrder: 3
    },
    {
      name: 'Sneha Desai',
      position: 'Agency Owner',
      description:
        'VIP mentorship was gold. We launched an AI support bot for a client within 10 days of the workshop.',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
      sortOrder: 4
    },
    {
      name: 'Vikram Joshi',
      position: 'Manufacturing Business Head',
      description:
        'Ops agents reduced our internal reporting chaos. Clear roadmap, practical sessions, zero fluff.',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
      sortOrder: 5
    },
    {
      name: 'Neha Kapoor',
      position: 'EdTech Founder',
      description:
        'The 90-day blueprint keeps us accountable. Best investment we made this year for the team.',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
      sortOrder: 6
    },
    {
      name: 'Karan Singh',
      position: 'Local Business Owner, Vadodara',
      description:
        'I came with zero tech background. By day 7 I had a working agent handling WhatsApp enquiries.',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80',
      sortOrder: 7
    },
    {
      name: 'Meera Iyer',
      position: 'Marketing Lead',
      description:
        'AI marketing engine sessions were insane. Our ad creatives and landing copy improved overnight.',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
      sortOrder: 8
    }
  ];

  await WebsiteTestimonial.insertMany(
    testimonials.map((t) => ({ ...t, isActive: true, isDeleted: false }))
  );
  console.log(`✓ ${testimonials.length} testimonials seeded`);

  // ── Gallery ──────────────────────────────────────────────
  const galleryImages = [
    { title: 'Surat Batch — Opening Day', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&q=80' },
    { title: 'Ahmedabad Workshop Floor', url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=900&q=80' },
    { title: 'Mentor Stage Keynote', url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=900&q=80' },
    { title: 'Hands-on Agent Lab', url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&q=80' },
    { title: 'Networking Break', url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=900&q=80' },
    { title: 'Mumbai Venue Setup', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80' },
    { title: 'Certificate Ceremony', url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=900&q=80' },
    { title: 'Team Breakout Session', url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&q=80' },
    { title: 'Live Demo Screen', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=900&q=80' },
    { title: 'Vadodara Alumni Meetup', url: 'https://images.unsplash.com/photo-1511632765486-a01980e38117?w=900&q=80' }
  ];

  const galleryVideos = [
    { title: 'Day 1 Recap', url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U' },
    { title: 'Student Testimonial Reel', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
    { title: 'Build an Agent — Live Demo', url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4' },
    { title: 'Workshop Trailer', url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ' },
    { title: 'Closing Day Highlights', url: 'https://www.youtube.com/watch?v=C0DPdy98e4c' },
    { title: 'Mentor Talk Snippet', url: 'https://www.youtube.com/watch?v=tgbNymZ7vqY' }
  ];

  await WebsiteGallery.insertMany([
    ...galleryImages.map((g, i) => ({
      type: 'image',
      title: g.title,
      mediaUrl: g.url,
      mediaFile: '',
      sortOrder: i + 1,
      isActive: true
    })),
    ...galleryVideos.map((g, i) => ({
      type: 'video',
      title: g.title,
      mediaUrl: g.url,
      mediaFile: '',
      sortOrder: i + 1,
      isActive: true
    }))
  ]);
  console.log(`✓ ${galleryImages.length} gallery images + ${galleryVideos.length} videos seeded`);

  console.log('\n✅ Website seed complete!');
  console.log('Open Admin → Website to review Hero, Workshops, Sessions, Testimonials, Gallery.');

  await mongoose.disconnect();
};

seedWebsiteData().catch(async (err) => {
  console.error('Seed failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
