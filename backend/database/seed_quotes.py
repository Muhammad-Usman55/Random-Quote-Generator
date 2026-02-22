"""
seed_quotes.py — One-time seed of the curated quotes collection.
Called from main.py lifespan after init_db().
Idempotent: only inserts rows when the quotes table is empty.
"""
from database.db import QuoteModel, SessionLocal

# fmt: off
SEED_QUOTES: list[dict] = [

    # ─── ENGLISH ────────────────────────────────────────────────────────────────

    # happy + love
    {"quote": "The best thing to hold onto in life is each other.", "author": "Audrey Hepburn", "language": "en", "mood": "happy", "topic": "love"},
    {"quote": "Where there is love there is life.", "author": "Mahatma Gandhi", "language": "en", "mood": "happy", "topic": "love"},

    # happy + life
    {"quote": "Life is what happens when you are busy making other plans.", "author": "John Lennon", "language": "en", "mood": "happy", "topic": "life"},
    {"quote": "Keep your face always toward the sunshine and shadows will fall behind you.", "author": "Walt Whitman", "language": "en", "mood": "happy", "topic": "life"},

    # happy + success
    {"quote": "Success is not the key to happiness. Happiness is the key to success.", "author": "Albert Schweitzer", "language": "en", "mood": "happy", "topic": "success"},

    # happy + friendship
    {"quote": "A good friend is like a four-leaf clover — hard to find and lucky to have.", "author": "Irish Proverb", "language": "en", "mood": "happy", "topic": "friendship"},
    {"quote": "Friendship is the only cement that will ever hold the world together.", "author": "Woodrow Wilson", "language": "en", "mood": "happy", "topic": "friendship"},

    # happy + nature
    {"quote": "Look deep into nature and then you will understand everything better.", "author": "Albert Einstein", "language": "en", "mood": "happy", "topic": "nature"},
    {"quote": "The earth laughs in flowers.", "author": "Ralph Waldo Emerson", "language": "en", "mood": "happy", "topic": "nature"},

    # happy + education
    {"quote": "Education is the most powerful weapon which you can use to change the world.", "author": "Nelson Mandela", "language": "en", "mood": "happy", "topic": "education"},

    # sad + life
    {"quote": "The tragedy of life is not that it ends so soon, but that we wait so long to begin it.", "author": "W. M. Lewis", "language": "en", "mood": "sad", "topic": "life"},
    {"quote": "Life is short and the world is wide.", "author": "Simon Raven", "language": "en", "mood": "sad", "topic": "life"},

    # sad + love
    {"quote": "The hottest love has the coldest end.", "author": "Socrates", "language": "en", "mood": "sad", "topic": "love"},

    # sad + wisdom
    {"quote": "The more I learn, the more I realize how much I don't know.", "author": "Albert Einstein", "language": "en", "mood": "sad", "topic": "wisdom"},
    {"quote": "Knowing yourself is the beginning of all wisdom.", "author": "Aristotle", "language": "en", "mood": "sad", "topic": "wisdom"},

    # sad + success
    {"quote": "The road to success and the road to failure are almost exactly the same.", "author": "Colin R. Davis", "language": "en", "mood": "sad", "topic": "success"},

    # sad + friendship
    {"quote": "It is easier to forgive an enemy than to forgive a friend.", "author": "William Blake", "language": "en", "mood": "sad", "topic": "friendship"},

    # sad + nature
    {"quote": "Even the darkest night will end and the sun will rise.", "author": "Victor Hugo", "language": "en", "mood": "sad", "topic": "nature"},

    # motivational + success
    {"quote": "The secret of getting ahead is getting started.", "author": "Mark Twain", "language": "en", "mood": "motivational", "topic": "success"},
    {"quote": "It always seems impossible until it is done.", "author": "Nelson Mandela", "language": "en", "mood": "motivational", "topic": "success"},
    {"quote": "Don't watch the clock; do what it does. Keep going.", "author": "Sam Levenson", "language": "en", "mood": "motivational", "topic": "success"},

    # motivational + life
    {"quote": "The purpose of our lives is to be happy.", "author": "Dalai Lama", "language": "en", "mood": "motivational", "topic": "life"},
    {"quote": "You only live once, but if you do it right, once is enough.", "author": "Mae West", "language": "en", "mood": "motivational", "topic": "life"},

    # motivational + education
    {"quote": "An investment in knowledge pays the best interest.", "author": "Benjamin Franklin", "language": "en", "mood": "motivational", "topic": "education"},
    {"quote": "Live as if you were to die tomorrow. Learn as if you were to live forever.", "author": "Mahatma Gandhi", "language": "en", "mood": "motivational", "topic": "education"},

    # motivational + friendship
    {"quote": "Surround yourself with only people who are going to lift you higher.", "author": "Oprah Winfrey", "language": "en", "mood": "motivational", "topic": "friendship"},

    # motivational + faith
    {"quote": "Faith is taking the first step even when you don't see the whole staircase.", "author": "Martin Luther King Jr.", "language": "en", "mood": "motivational", "topic": "faith"},

    # motivational + nature
    {"quote": "In every walk with nature, one receives far more than he seeks.", "author": "John Muir", "language": "en", "mood": "motivational", "topic": "nature"},

    # inspiring + wisdom
    {"quote": "In the middle of every difficulty lies opportunity.", "author": "Albert Einstein", "language": "en", "mood": "inspiring", "topic": "wisdom"},
    {"quote": "The only true wisdom is knowing you know nothing.", "author": "Socrates", "language": "en", "mood": "inspiring", "topic": "wisdom"},

    # inspiring + love
    {"quote": "To love and be loved is to feel the sun from both sides.", "author": "David Viscott", "language": "en", "mood": "inspiring", "topic": "love"},
    {"quote": "The giving of love is an education in itself.", "author": "Eleanor Roosevelt", "language": "en", "mood": "inspiring", "topic": "love"},

    # inspiring + success
    {"quote": "Success usually comes to those who are too busy to be looking for it.", "author": "Henry David Thoreau", "language": "en", "mood": "inspiring", "topic": "success"},
    {"quote": "Opportunities don't happen. You create them.", "author": "Chris Grosser", "language": "en", "mood": "inspiring", "topic": "success"},

    # inspiring + education
    {"quote": "The roots of education are bitter, but the fruit is sweet.", "author": "Aristotle", "language": "en", "mood": "inspiring", "topic": "education"},

    # inspiring + faith
    {"quote": "All things are possible to him who believes.", "author": "Bible (Mark 9:23)", "language": "en", "mood": "inspiring", "topic": "faith"},

    # inspiring + friendship
    {"quote": "A real friend is one who walks in when the rest of the world walks out.", "author": "Walter Winchell", "language": "en", "mood": "inspiring", "topic": "friendship"},

    # inspiring + nature
    {"quote": "Nature always wears the colors of the spirit.", "author": "Ralph Waldo Emerson", "language": "en", "mood": "inspiring", "topic": "nature"},

    # peaceful + life
    {"quote": "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.", "author": "Buddha", "language": "en", "mood": "peaceful", "topic": "life"},
    {"quote": "Simplicity is the ultimate sophistication.", "author": "Leonardo da Vinci", "language": "en", "mood": "peaceful", "topic": "life"},

    # peaceful + love
    {"quote": "Love is composed of a single soul inhabiting two bodies.", "author": "Aristotle", "language": "en", "mood": "peaceful", "topic": "love"},

    # peaceful + wisdom
    {"quote": "Three things cannot be long hidden: the sun, the moon, and the truth.", "author": "Buddha", "language": "en", "mood": "peaceful", "topic": "wisdom"},

    # peaceful + success
    {"quote": "It does not matter how slowly you go, as long as you do not stop.", "author": "Confucius", "language": "en", "mood": "peaceful", "topic": "success"},

    # peaceful + nature
    {"quote": "The clearest way into the Universe is through a forest wilderness.", "author": "John Muir", "language": "en", "mood": "peaceful", "topic": "nature"},
    {"quote": "Adopt the pace of nature: her secret is patience.", "author": "Ralph Waldo Emerson", "language": "en", "mood": "peaceful", "topic": "nature"},

    # peaceful + faith
    {"quote": "He who has faith has an inward reservoir of courage, hope, confidence, and assurance.", "author": "B.C. Forbes", "language": "en", "mood": "peaceful", "topic": "faith"},

    # peaceful + friendship
    {"quote": "The most beautiful discovery true friends make is that they can grow separately without growing apart.", "author": "Elisabeth Foley", "language": "en", "mood": "peaceful", "topic": "friendship"},

    # funny + life
    {"quote": "The elevator to success is out of order. You'll have to use the stairs.", "author": "Joe Girard", "language": "en", "mood": "funny", "topic": "life"},
    {"quote": "Age is merely the number of years the world has been enjoying you.", "author": "Unknown", "language": "en", "mood": "funny", "topic": "life"},

    # funny + success
    {"quote": "I find that the harder I work, the more luck I seem to have.", "author": "Thomas Jefferson", "language": "en", "mood": "funny", "topic": "success"},

    # funny + wisdom
    {"quote": "Wisdom comes from experience. Experience is often a result of lack of wisdom.", "author": "Terry Pratchett", "language": "en", "mood": "funny", "topic": "wisdom"},

    # funny + education
    {"quote": "I have never let my schooling interfere with my education.", "author": "Mark Twain", "language": "en", "mood": "funny", "topic": "education"},

    # funny + friendship
    {"quote": "Friends buy you food. Best friends eat your food.", "author": "Unknown", "language": "en", "mood": "funny", "topic": "friendship"},

    # funny + love
    {"quote": "Love is being stupid together.", "author": "Paul Valery", "language": "en", "mood": "funny", "topic": "love"},

    # funny + nature
    {"quote": "I go to nature to be soothed and healed — and to have my senses put in order.", "author": "John Burroughs", "language": "en", "mood": "funny", "topic": "nature"},

    # ─── URDU ───────────────────────────────────────────────────────────────────

    # happy + love
    {"quote": "محبت وہ پھول ہے جو کانٹوں کے درمیان بھی کھِلتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "happy", "topic": "love"},

    # happy + life
    {"quote": "حاصلِ زندگی کیا ہے؟ ایک مسکراہٹ اور سکون۔", "author": "اشفاق احمد", "language": "ur", "mood": "happy", "topic": "life"},
    {"quote": "زندگی خوبصورت ہے، اگر ہم اسے خوبصورت نظروں سے دیکھیں۔", "author": "نامعلوم", "language": "ur", "mood": "happy", "topic": "life"},

    # happy + friendship
    {"quote": "سچا دوست وہ ہوتا ہے جو آپ کی خامیاں جانتا ہو، پھر بھی آپ کا ساتھ دے۔", "author": "نامعلوم", "language": "ur", "mood": "happy", "topic": "friendship"},

    # sad + life
    {"quote": "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے۔", "author": "مرزا غالب", "language": "ur", "mood": "sad", "topic": "life"},
    {"quote": "زندگی مختصر ہے، اسے اچھے کاموں میں گزارو۔", "author": "حضرت علیؓ", "language": "ur", "mood": "sad", "topic": "life"},

    # sad + love
    {"quote": "اپنے دشمنوں کو معاف کر دو مگر ان کے نام کبھی مت بھولو۔", "author": "جان ایف کینیڈی", "language": "ur", "mood": "sad", "topic": "love"},

    # sad + wisdom
    {"quote": "انسان سب سے زیادہ اس وقت سیکھتا ہے جب وہ تکلیف میں ہوتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "sad", "topic": "wisdom"},

    # motivational + success
    {"quote": "جو ہمت کرتا ہے وہی کامیابی پاتا ہے۔", "author": "علامہ اقبال", "language": "ur", "mood": "motivational", "topic": "success"},
    {"quote": "کامیاب لوگ وہ ہیں جو ناکامی سے اٹھے ہوں۔", "author": "نامعلوم", "language": "ur", "mood": "motivational", "topic": "success"},

    # motivational + life
    {"quote": "جو دوسروں کے لیے جیتا ہے، وہی اصل میں جیتا ہے۔", "author": "علامہ اقبال", "language": "ur", "mood": "motivational", "topic": "life"},

    # motivational + education
    {"quote": "علم حاصل کرو، خواہ چین جانا پڑے۔", "author": "حضرت محمد ﷺ", "language": "ur", "mood": "motivational", "topic": "education"},

    # motivational + faith
    {"quote": "یقین وہ طاقت ہے جو ناممکن کو ممکن بنا دیتی ہے۔", "author": "نامعلوم", "language": "ur", "mood": "motivational", "topic": "faith"},

    # inspiring + wisdom
    {"quote": "جو خود کو پہچان لے، وہ سب کو پہچان لیتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "inspiring", "topic": "wisdom"},

    # inspiring + life
    {"quote": "خواب وہ نہیں جو آنکھ بند کرنے سے آئیں، خواب وہ ہیں جو آنکھ کھلی رکھیں۔", "author": "اے پی جے عبدالکلام", "language": "ur", "mood": "inspiring", "topic": "life"},

    # inspiring + faith
    {"quote": "جب خدا پر بھروسا ہو تو کوئی راستہ بند نہیں رہتا۔", "author": "نامعلوم", "language": "ur", "mood": "inspiring", "topic": "faith"},

    # peaceful + life
    {"quote": "امید وہ روشنی ہے جو اندھیرے میں بھی راستہ دکھاتی ہے۔", "author": "نامعلوم", "language": "ur", "mood": "peaceful", "topic": "life"},

    # peaceful + nature
    {"quote": "قدرت کی خاموشی میں خدا کی آواز سنائی دیتی ہے۔", "author": "نامعلوم", "language": "ur", "mood": "peaceful", "topic": "nature"},

    # peaceful + faith
    {"quote": "جس دل میں صبر ہو، اس دل میں خدا ہوتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "peaceful", "topic": "faith"},

    # funny + life
    {"quote": "اگر آپ اچھے خیالات رکھتے ہیں تو آپ کے چہرے پر بھی اچھائی جھلکے گی۔", "author": "رولڈ ڈاہل", "language": "ur", "mood": "funny", "topic": "life"},

    # inspiring + success (extra to ensure coverage)
    {"quote": "انسان وہی ہے جو انسانیت کے کام آئے۔", "author": "عبدالستار ایدھی", "language": "ur", "mood": "inspiring", "topic": "success"},

    # ─── ENGLISH — MISSING COMBOS ───────────────────────────────────────────────

    # happy + wisdom
    {"quote": "The happiness of your life depends upon the quality of your thoughts.", "author": "Marcus Aurelius", "language": "en", "mood": "happy", "topic": "wisdom"},
    {"quote": "Happiness is not something ready-made. It comes from your own actions.", "author": "Dalai Lama", "language": "en", "mood": "happy", "topic": "wisdom"},
    {"quote": "A wise man is happy with little.", "author": "Socrates", "language": "en", "mood": "happy", "topic": "wisdom"},

    # happy + faith
    {"quote": "Faith is the bird that feels the light and sings when the dawn is still dark.", "author": "Rabindranath Tagore", "language": "en", "mood": "happy", "topic": "faith"},
    {"quote": "All I have seen teaches me to trust the Creator for all I have not seen.", "author": "Ralph Waldo Emerson", "language": "en", "mood": "happy", "topic": "faith"},
    {"quote": "Faith does not make things easy, it makes them possible.", "author": "Unknown", "language": "en", "mood": "happy", "topic": "faith"},

    # sad + education
    {"quote": "Education is what remains after one has forgotten what one has learned in school.", "author": "Albert Einstein", "language": "en", "mood": "sad", "topic": "education"},
    {"quote": "Self-education is, I firmly believe, the only kind of education there is.", "author": "Isaac Asimov", "language": "en", "mood": "sad", "topic": "education"},
    {"quote": "The best education in the world is that got by struggling to get a living.", "author": "Wendell Phillips", "language": "en", "mood": "sad", "topic": "education"},

    # sad + faith
    {"quote": "In the darkest moments, faith is the only light that remains.", "author": "Unknown", "language": "en", "mood": "sad", "topic": "faith"},
    {"quote": "Sometimes God lets you hit rock bottom so that you discover that He is the rock at the bottom.", "author": "Tony Evans", "language": "en", "mood": "sad", "topic": "faith"},
    {"quote": "Faith is seeing light with your heart when all your eyes see is darkness.", "author": "Barbara Johnson", "language": "en", "mood": "sad", "topic": "faith"},

    # motivational + love
    {"quote": "Love yourself first and everything else falls into line.", "author": "Lucille Ball", "language": "en", "mood": "motivational", "topic": "love"},
    {"quote": "You yourself, as much as anybody in the entire universe, deserve your love and affection.", "author": "Buddha", "language": "en", "mood": "motivational", "topic": "love"},
    {"quote": "The most important thing in life is to learn how to give out love and to let it come in.", "author": "Morrie Schwartz", "language": "en", "mood": "motivational", "topic": "love"},

    # motivational + wisdom
    {"quote": "Knowing is not enough; we must apply. Willing is not enough; we must do.", "author": "Johann Wolfgang von Goethe", "language": "en", "mood": "motivational", "topic": "wisdom"},
    {"quote": "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", "author": "Rumi", "language": "en", "mood": "motivational", "topic": "wisdom"},
    {"quote": "Turn your wounds into wisdom.", "author": "Oprah Winfrey", "language": "en", "mood": "motivational", "topic": "wisdom"},

    # inspiring + life
    {"quote": "Life is not measured by the number of breaths we take, but by the moments that take our breath away.", "author": "Maya Angelou", "language": "en", "mood": "inspiring", "topic": "life"},
    {"quote": "Life is either a daring adventure or nothing at all.", "author": "Helen Keller", "language": "en", "mood": "inspiring", "topic": "life"},
    {"quote": "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate.", "author": "Ralph Waldo Emerson", "language": "en", "mood": "inspiring", "topic": "life"},

    # peaceful + education
    {"quote": "Education is not preparation for life; education is life itself.", "author": "John Dewey", "language": "en", "mood": "peaceful", "topic": "education"},
    {"quote": "The mind is not a vessel to be filled, but a fire to be kindled.", "author": "Plutarch", "language": "en", "mood": "peaceful", "topic": "education"},
    {"quote": "Learning is not attained by chance; it must be sought with ardor and attended to with diligence.", "author": "Abigail Adams", "language": "en", "mood": "peaceful", "topic": "education"},

    # funny + faith
    {"quote": "Going to church doesn't make you a Christian any more than standing in a garage makes you a car.", "author": "Billy Sunday", "language": "en", "mood": "funny", "topic": "faith"},
    {"quote": "God is a comedian playing to an audience too afraid to laugh.", "author": "Voltaire", "language": "en", "mood": "funny", "topic": "faith"},
    {"quote": "I asked God for a bike, but I know He doesn't work that way. So I stole a bike and asked for forgiveness.", "author": "Emo Philips", "language": "en", "mood": "funny", "topic": "faith"},

    # ─── ENGLISH — SPARSE COMBOS (adding 2+ more each) ──────────────────────────

    # happy + success (was 1)
    {"quote": "The only way to do great work is to love what you do.", "author": "Steve Jobs", "language": "en", "mood": "happy", "topic": "success"},
    {"quote": "Choose a job you love and you will never have to work a day in your life.", "author": "Confucius", "language": "en", "mood": "happy", "topic": "success"},

    # happy + education (was 1)
    {"quote": "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", "author": "Dr. Seuss", "language": "en", "mood": "happy", "topic": "education"},
    {"quote": "Learning is a treasure that will follow its owner everywhere.", "author": "Chinese Proverb", "language": "en", "mood": "happy", "topic": "education"},

    # sad + love (was 1)
    {"quote": "It is better to have loved and lost than never to have loved at all.", "author": "Alfred Lord Tennyson", "language": "en", "mood": "sad", "topic": "love"},
    {"quote": "The pain of love is the pain of being alive. It is a perpetual wound.", "author": "Maureen Duffy", "language": "en", "mood": "sad", "topic": "love"},

    # motivational + friendship (was 1)
    {"quote": "A single rose can be my garden; a single friend, my world.", "author": "Leo Buscaglia", "language": "en", "mood": "motivational", "topic": "friendship"},
    {"quote": "Keep away from those who try to belittle your ambitions. Small people always do that, but the really great make you feel that you, too, can become great.", "author": "Mark Twain", "language": "en", "mood": "motivational", "topic": "friendship"},

    # motivational + faith (was 1)
    {"quote": "God never said the journey would be easy, but He said the arrival would be worthwhile.", "author": "Max Lucado", "language": "en", "mood": "motivational", "topic": "faith"},
    {"quote": "Trust in the Lord with all your heart and lean not on your own understanding.", "author": "Proverbs 3:5", "language": "en", "mood": "motivational", "topic": "faith"},

    # motivational + nature (was 1)
    {"quote": "The earth has music for those who listen.", "author": "George Santayana", "language": "en", "mood": "motivational", "topic": "nature"},
    {"quote": "Not all those who wander are lost.", "author": "J.R.R. Tolkien", "language": "en", "mood": "motivational", "topic": "nature"},

    # inspiring + education (was 1)
    {"quote": "The purpose of education is to replace an empty mind with an open one.", "author": "Malcolm Forbes", "language": "en", "mood": "inspiring", "topic": "education"},
    {"quote": "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", "author": "Malcolm X", "language": "en", "mood": "inspiring", "topic": "education"},

    # inspiring + faith (was 1)
    {"quote": "With God, all things are possible.", "author": "Matthew 19:26", "language": "en", "mood": "inspiring", "topic": "faith"},
    {"quote": "If you have faith as small as a mustard seed, you can say to this mountain, 'Move,' and it will move.", "author": "Matthew 17:20", "language": "en", "mood": "inspiring", "topic": "faith"},

    # inspiring + friendship (was 1)
    {"quote": "Friendship is born at the moment when one person says to another, 'What! You too? I thought I was the only one.'", "author": "C.S. Lewis", "language": "en", "mood": "inspiring", "topic": "friendship"},
    {"quote": "True friendship comes when the silence between two people is comfortable.", "author": "David Tyson", "language": "en", "mood": "inspiring", "topic": "friendship"},

    # inspiring + nature (was 1)
    {"quote": "The woods are lovely, dark and deep, but I have promises to keep.", "author": "Robert Frost", "language": "en", "mood": "inspiring", "topic": "nature"},
    {"quote": "One touch of nature makes the whole world kin.", "author": "William Shakespeare", "language": "en", "mood": "inspiring", "topic": "nature"},

    # peaceful + love (was 1)
    {"quote": "Love is patient, love is kind.", "author": "1 Corinthians 13:4", "language": "en", "mood": "peaceful", "topic": "love"},
    {"quote": "True love is not a strong, fiery, impetuous passion. It is a calm and restful flame.", "author": "Ocean Vuong", "language": "en", "mood": "peaceful", "topic": "love"},

    # peaceful + wisdom (was 1)
    {"quote": "The quieter you become, the more you are able to hear.", "author": "Rumi", "language": "en", "mood": "peaceful", "topic": "wisdom"},
    {"quote": "In the silence of the heart, wisdom speaks.", "author": "Unknown", "language": "en", "mood": "peaceful", "topic": "wisdom"},

    # peaceful + success (was 1)
    {"quote": "Success is peace of mind, which is a direct result of self-satisfaction in knowing you made the effort to do your best.", "author": "John Wooden", "language": "en", "mood": "peaceful", "topic": "success"},
    {"quote": "Real success is finding your lifework in the work that you love.", "author": "David McCullough", "language": "en", "mood": "peaceful", "topic": "success"},

    # peaceful + faith (was 1)
    {"quote": "Peace I leave with you; my peace I give you.", "author": "John 14:27", "language": "en", "mood": "peaceful", "topic": "faith"},
    {"quote": "Cast all your anxiety on him because he cares for you.", "author": "1 Peter 5:7", "language": "en", "mood": "peaceful", "topic": "faith"},

    # peaceful + friendship (was 1)
    {"quote": "Silences make the real conversations between friends.", "author": "Margaret Lee Runbeck", "language": "en", "mood": "peaceful", "topic": "friendship"},
    {"quote": "A friend is someone who gives you total freedom to be yourself.", "author": "Jim Morrison", "language": "en", "mood": "peaceful", "topic": "friendship"},

    # funny + success (was 1)
    {"quote": "The road to success is dotted with many tempting parking spaces.", "author": "Will Rogers", "language": "en", "mood": "funny", "topic": "success"},
    {"quote": "If at first you don't succeed, then skydiving definitely isn't for you.", "author": "Steven Wright", "language": "en", "mood": "funny", "topic": "success"},

    # funny + wisdom (was 1)
    {"quote": "The trouble with the world is that the stupid are cocksure and the intelligent full of doubt.", "author": "Bertrand Russell", "language": "en", "mood": "funny", "topic": "wisdom"},
    {"quote": "Get your facts first, then you can distort them as you please.", "author": "Mark Twain", "language": "en", "mood": "funny", "topic": "wisdom"},

    # funny + education (was 1)
    {"quote": "In school, you're taught a lesson and then given a test. In life, you're given a test that teaches you a lesson.", "author": "Tom Bodett", "language": "en", "mood": "funny", "topic": "education"},
    {"quote": "Education is an admirable thing, but it is well to remember that nothing worth knowing can be taught.", "author": "Oscar Wilde", "language": "en", "mood": "funny", "topic": "education"},

    # funny + friendship (was 1)
    {"quote": "A good friend will help you move. A best friend will help you move a dead body.", "author": "Unknown", "language": "en", "mood": "funny", "topic": "friendship"},
    {"quote": "We'll be the old ladies causing trouble in the nursing home.", "author": "Unknown", "language": "en", "mood": "funny", "topic": "friendship"},

    # funny + love (was 1)
    {"quote": "Before you marry a person, you should first make them use a computer with slow Internet to see who they really are.", "author": "Will Ferrell", "language": "en", "mood": "funny", "topic": "love"},
    {"quote": "I love you more than coffee, but please don't make me prove it.", "author": "Unknown", "language": "en", "mood": "funny", "topic": "love"},

    # funny + nature (was 1)
    {"quote": "I'm an early bird and a night owl. So I'm wise and I have worms.", "author": "Michael Scott", "language": "en", "mood": "funny", "topic": "nature"},
    {"quote": "The best fertilizer is the gardener's shadow.", "author": "Unknown", "language": "en", "mood": "funny", "topic": "nature"},

    # ─── URDU — ADDITIONAL COVERAGE ─────────────────────────────────────────────

    # happy + success
    {"quote": "محنت کا پھل ہمیشہ میٹھا ہوتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "happy", "topic": "success"},
    # happy + wisdom
    {"quote": "خوشی اُس کو ملتی ہے جو دوسروں کو خوشی دیتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "happy", "topic": "wisdom"},
    # happy + nature
    {"quote": "قدرت کی گود میں سچا سکون ملتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "happy", "topic": "nature"},
    # happy + faith
    {"quote": "جو خدا پر یقین رکھے، وہ کبھی مایوس نہیں ہوتا۔", "author": "نامعلوم", "language": "ur", "mood": "happy", "topic": "faith"},
    # happy + education
    {"quote": "علم حاصل کرنا سب سے بڑی نعمت ہے۔", "author": "نامعلوم", "language": "ur", "mood": "happy", "topic": "education"},
    # sad + friendship
    {"quote": "سچا دوست وہ ہوتا ہے جو برے وقت میں ساتھ ہو۔", "author": "نامعلوم", "language": "ur", "mood": "sad", "topic": "friendship"},
    # sad + success
    {"quote": "جو گرتا ہے وہی اٹھنا جانتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "sad", "topic": "success"},
    # sad + education
    {"quote": "علم وہ روشنی ہے جو اندھیرے میں راستہ دکھاتی ہے۔", "author": "نامعلوم", "language": "ur", "mood": "sad", "topic": "education"},
    # sad + faith
    {"quote": "مشکل وقت میں صبر اور خدا پر بھروسہ ہی سہارا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "sad", "topic": "faith"},
    # sad + nature
    {"quote": "خزاں کے بعد بہار ضرور آتی ہے۔", "author": "نامعلوم", "language": "ur", "mood": "sad", "topic": "nature"},
    # motivational + nature
    {"quote": "ہر صبح ایک نئی زندگی کا آغاز ہے۔", "author": "نامعلوم", "language": "ur", "mood": "motivational", "topic": "nature"},
    # motivational + wisdom
    {"quote": "علم وہ روشنی ہے جو کبھی نہیں بجھتی۔", "author": "نامعلوم", "language": "ur", "mood": "motivational", "topic": "wisdom"},
    # motivational + love
    {"quote": "محبت وہ طاقت ہے جو ہمیں آگے بڑھاتی ہے۔", "author": "نامعلوم", "language": "ur", "mood": "motivational", "topic": "love"},
    # motivational + friendship
    {"quote": "ایک سچا دوست ہزار دشمنوں سے بچاتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "motivational", "topic": "friendship"},
    # inspiring + love
    {"quote": "محبت کرنا سیکھو، یہی زندگی کا اصل مقصد ہے۔", "author": "نامعلوم", "language": "ur", "mood": "inspiring", "topic": "love"},
    # inspiring + friendship
    {"quote": "دوستی وہ رشتہ ہے جو روح کو تازہ رکھتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "inspiring", "topic": "friendship"},
    # inspiring + education
    {"quote": "جو پڑھتا ہے، وہی آگے بڑھتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "inspiring", "topic": "education"},
    # inspiring + nature
    {"quote": "قدرت سے سیکھو، وہ بہترین استاد ہے۔", "author": "نامعلوم", "language": "ur", "mood": "inspiring", "topic": "nature"},
    # peaceful + wisdom
    {"quote": "خاموشی میں بھی بہت کچھ کہا جا سکتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "peaceful", "topic": "wisdom"},
    # peaceful + love
    {"quote": "سچی محبت میں سکون اور اطمینان ہوتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "peaceful", "topic": "love"},
    # peaceful + friendship
    {"quote": "سچے دوست کی محبت دل کو سکون دیتی ہے۔", "author": "نامعلوم", "language": "ur", "mood": "peaceful", "topic": "friendship"},
    # peaceful + success
    {"quote": "صبر کا پھل ہمیشہ میٹھا ہوتا ہے۔", "author": "نامعلوم", "language": "ur", "mood": "peaceful", "topic": "success"},
    # peaceful + education
    {"quote": "علم سیکھنا عبادت کے برابر ہے۔", "author": "نامعلوم", "language": "ur", "mood": "peaceful", "topic": "education"},
    # funny + life
    {"quote": "زندگی اگر سیدھی ہوتی تو دلچسپ نہ ہوتی۔", "author": "نامعلوم", "language": "ur", "mood": "funny", "topic": "life"},
    # funny + friendship
    {"quote": "اچھا دوست وہ ہے جو آپ کی بات کو سمجھے بغیر مصالحے کے۔", "author": "نامعلوم", "language": "ur", "mood": "funny", "topic": "friendship"},
]
# fmt: on


def seed_db() -> None:
    """Insert any SEED_QUOTES not yet in the DB (idempotent per quote text)."""
    db = SessionLocal()
    try:
        existing = {row.quote for row in db.query(QuoteModel.quote).all()}
        new_quotes = [q for q in SEED_QUOTES if q["quote"] not in existing]
        if new_quotes:
            db.bulk_insert_mappings(QuoteModel, new_quotes)
            db.commit()
            print(f"[seed] Inserted {len(new_quotes)} new quotes ({len(existing)} already existed).")
        else:
            print(f"[seed] All {len(existing)} quotes already present — nothing to insert.")
    finally:
        db.close()
