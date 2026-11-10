/**
 * 계단실 벽 문구. 앱 특징 문구 + 공통 문구를 섞고, 한 건물 안에서는 문구가 다 떨어지기 전까지 반복하지 않는다.
 * 종류: cheer(응원) · warn(도파민 경고) · outside(폰을 내려놓으면 보이는 세상) · quote(명언·속담)
 * 명언은 출처가 분명한 것만 짧게 옮겼다.
 */
export type MessageKind = 'cheer' | 'warn' | 'outside' | 'quote';
import { getLocale, tr, type Locale } from '../i18n';

export interface WallMessage { kind: MessageKind; text: string; by?: string }

/** 문구 종류 이름 (언어별) */
export const kindLabel = (k: MessageKind, l: Locale = getLocale()): string => {
  const t = tr(l);
  return k === 'cheer' ? t.kindCheer : k === 'warn' ? t.kindWarn : k === 'outside' ? t.kindOutside : t.kindQuote;
};
/** @deprecated 한국어 고정 이름 — kindLabel을 쓴다 */
export const KIND_LABEL: Record<MessageKind, string> = { cheer: '응원', warn: '잠깐!', outside: '바깥', quote: '명언' };

/** 한국어·영어를 함께 가진 문구 */
interface Entry { kind: MessageKind; ko: string; en: string; by?: [string, string] }
const C = (ko: string, en: string): Entry => ({ kind: 'cheer', ko, en });
const W = (ko: string, en: string): Entry => ({ kind: 'warn', ko, en });
const O = (ko: string, en: string): Entry => ({ kind: 'outside', ko, en });
const Q = (ko: string, en: string, byKo: string, byEn: string): Entry => ({ kind: 'quote', ko, en, by: [byKo, byEn] });
const pick = (e: Entry, l: Locale): WallMessage => ({ kind: e.kind, text: l === 'en' ? e.en : e.ko, by: e.by ? e.by[l === 'en' ? 1 : 0] : undefined });

/** 앱별 문구 */
const APP: Record<string, Entry[]> = {
  youtube: [
    W('다음 영상은 5초 뒤 자동 재생돼요. 당신의 다음 5초는요?', 'The next video autoplays in 5 seconds. What about your next 5 seconds?'),
    W('알고리즘은 당신이 멈추지 않기를 바라요.', 'The algorithm hopes you never stop.'),
    W('쇼츠 한 편은 짧지만, 백 편이면 한 시간이 사라져요.', 'One Short is short. A hundred of them is an hour gone.'),
    W('“하나만 더”는 오늘 몇 번째였나요?', 'How many times have you said “just one more” today?'),
    W('추천 영상은 끝이 없지만, 오늘 하루는 끝이 있어요.', 'Recommendations never end, but today does.'),
    W('건너뛰기를 누르듯 하루를 건너뛰고 있진 않나요?', 'Are you skipping your day like you skip ads?'),
    W('나중에 볼 동영상 목록, 정말 나중에 볼까요?', 'Your Watch Later list: will you really watch it later?'),
    W('남이 먹는 걸 보는 시간에 내가 맛있는 걸 먹어도 돼요.', 'Instead of watching someone eat, go eat something delicious.'),
    W('1.5배속으로 봐도 하루는 1배속으로 흘러가요.', 'Even at 1.5x speed, your day still runs at 1x.'),
    W('썸네일은 늘 실제보다 재밌어 보여요.', 'Thumbnails always look more fun than the real thing.'),
    W('“이것만 보고 자야지”가 새벽 두 시가 되기도 해요.', '“Just this one, then bed” can turn into 2 a.m.'),
    W('구독 알림 종보다 내 몸이 보내는 신호를 먼저 들어주세요.', 'Listen to your body before the notification bell.'),
    C('영상 속 누군가의 여행 대신, 지금 내 계단을 오르는 중이에요.', 'Instead of watching someone else’s trip, you’re climbing your own stairs.'),
    C('이 진행률은 재생 바보다 확실해요. 당신이 직접 움직였으니까요.', 'This progress bar is more real than any video’s. You moved yourself.'),
    C('구독보다 소중한 건 내 하루를 직접 보는 일이에요.', 'Watching your own day matters more than any subscription.'),
    C('보던 영상 하나 멈춘 것, 그게 오늘의 큰 한 걸음이에요.', 'Pausing one video was today’s big step.'),
    C('브이로그 주인공 말고, 내 하루의 주인공이 되는 중이에요.', 'Not a vlog star, but the star of your own day.'),
    C('배우고 싶던 걸 영상으로만 봤다면, 오늘은 직접 해볼까요?', 'If you’ve only watched tutorials, why not try it for real today?'),
    O('화면 밖 풍경엔 건너뛰기 버튼이 없어요. 그래서 오래 남아요.', 'The world outside has no skip button. That’s why it stays with you.'),
    O('오늘은 누군가의 브이로그 말고, 내 하루를 찍어볼까요?', 'Today, instead of someone’s vlog, how about living your own?'),
    O('자동 재생을 끄면, 창밖 소리가 켜져요.', 'Turn off autoplay, and the sounds outside turn on.'),
    O('먹방 대신 오늘은 직접 요리해 보는 건 어때요?', 'Skip the food videos and cook something yourself today.'),
    O('운동 영상을 보는 대신, 운동화를 신고 나가 볼까요?', 'Instead of a workout video, lace up your shoes and head out.'),
    O('노래 영상 대신 진짜 공연장에 가보세요. 소리가 몸으로 들어와요.', 'Go to a real concert. Music hits differently in person.'),
  ],
  instagram: [
    W('남의 하이라이트와 나의 비하인드를 비교하지 마세요.', 'Don’t compare your behind-the-scenes with someone’s highlight reel.'),
    W('피드는 끝나지 않도록 만들어졌어요.', 'The feed is designed never to end.'),
    W('좋아요 숫자는 당신의 가치를 세지 못해요.', 'Likes can’t count your worth.'),
    W('스토리는 24시간이면 사라져요. 당신의 24시간은요?', 'Stories vanish in 24 hours. What about your 24 hours?'),
    W('새로고침을 당길 때마다 기대가 조금씩 닳아요.', 'Every pull to refresh wears your hope down a little.'),
    W('릴스 다음 릴스, 그다음은 또 릴스예요.', 'Reel after reel, and then another reel.'),
    W('남의 여행 사진을 넘기다 내 주말이 지나가요.', 'Scrolling through other people’s trips, your weekend slips by.'),
    W('보정된 얼굴보다 웃는 얼굴이 더 예뻐요.', 'A smiling face beats an edited one.'),
    W('누가 내 스토리를 봤는지 확인하는 대신, 누구를 직접 볼지 정해봐요.', 'Instead of checking who viewed your story, decide who you’ll see in person.'),
    W('부러움은 스크롤할수록 커지고, 산책할수록 작아져요.', 'Envy grows as you scroll and shrinks as you walk.'),
    C('필터 없는 오늘의 당신도 충분히 괜찮아요.', 'Unfiltered, you are more than enough today.'),
    C('보여주기 위한 하루 말고, 나를 위한 하루도 괜찮아요.', 'A day for yourself, not for showing, is a good day.'),
    C('팔로워 수보다 곁에 있는 한 사람이 더 커요.', 'One person by your side outweighs any follower count.'),
    C('올리지 않은 하루도 분명히 멋진 하루였어요.', 'A day you didn’t post was still a great day.'),
    C('남과 다른 속도로 걸어도 괜찮아요.', 'It’s okay to walk at your own pace.'),
    C('오늘 가장 잘한 일은 아무도 몰라도 돼요.', 'Your best moment today doesn’t need an audience.'),
    O('찍지 않고 그냥 바라본 노을이 가장 오래 기억돼요.', 'The sunset you watched without a camera stays with you longest.'),
    O('오늘 가장 예쁜 장면은 업로드되지 않아도 돼요.', 'Today’s prettiest scene doesn’t need to be uploaded.'),
    O('사진 속 카페 말고, 진짜 커피 향을 맡으러 가요.', 'Skip the café photos and go smell real coffee.'),
    O('카메라를 내리면 눈앞 사람의 표정이 보여요.', 'Lower the camera and you’ll see the face in front of you.'),
    O('해시태그 없는 하루, 생각보다 가벼워요.', 'A day without hashtags feels lighter than you’d think.'),
    O('오늘은 꽃을 찍는 대신 냄새를 맡아볼까요?', 'Today, smell the flowers instead of photographing them.'),
  ],
  kakaotalk: [
    W('안 읽은 메시지 숫자보다 마주 본 얼굴이 많은 하루를.', 'May you see more faces today than unread messages.'),
    W('알림은 급해 보이지만, 대부분은 기다려 줘요.', 'Notifications look urgent, but most can wait.'),
    W('단톡방 숫자 1이 줄어들 때마다 내 시간도 줄어요.', 'Every time the unread count drops, so does your time.'),
    W('읽씹이 걱정돼 계속 폰을 보고 있진 않나요?', 'Are you glued to your phone, worried about leaving someone on read?'),
    W('밤 열한 시의 단톡방은 내일 아침에 읽어도 돼요.', 'The 11 p.m. group chat can wait until morning.'),
    W('알림 미리보기만 꺼도 하루가 조용해져요.', 'Just turning off previews makes the day quieter.'),
    W('대화가 끝났는데도 채팅방을 다시 열고 있진 않나요?', 'Do you keep reopening a chat that’s already over?'),
    C('답장은 조금 늦어도 괜찮아요. 관계는 그렇게 쉽게 끊기지 않아요.', 'A slow reply is fine. Friendships don’t break that easily.'),
    C('오늘 한 사람에게 전화를 걸어보는 건 어때요?', 'How about calling someone today?'),
    C('이모티콘보다 진짜 웃음소리가 더 따뜻해요.', 'Real laughter is warmer than any emoji.'),
    C('짧은 답장보다 긴 산책이 우정을 더 깊게 해요.', 'A long walk deepens a friendship more than a quick reply.'),
    C('고마운 사람에게 직접 고맙다고 말해볼까요?', 'Why not say thank you to someone in person?'),
    C('읽지 않은 메시지가 있어도, 당신은 충분히 좋은 친구예요.', 'Even with unread messages, you’re a good friend.'),
    O('단톡방 밖에도 대화가 있어요. 눈을 맞추는 대화요.', 'There are conversations beyond the group chat, the eye-to-eye kind.'),
    O('“지금 뭐해?” 대신 “지금 만날래?”', 'Instead of “What are you up to?”, try “Want to meet up?”'),
    O('폰을 엎어두고 밥을 먹으면, 맛이 더 잘 느껴져요.', 'Put your phone face down at meals and the food tastes better.'),
    O('오랜 친구에게 손편지를 써보는 건 어때요?', 'How about writing a letter to an old friend?'),
    O('같은 방에 있다면 메시지 말고 목소리로 불러요.', 'If you’re in the same room, use your voice, not a message.'),
    O('약속 장소에 먼저 도착해 하늘을 보는 것도 좋아요.', 'Arrive early and look at the sky while you wait.'),
  ],
  safari: [
    W('탭이 몇 개 열려 있나요? 마음에도 탭이 쌓여요.', 'How many tabs are open? Your mind collects tabs too.'),
    W('링크를 따라가다 처음 찾던 걸 잊진 않았나요?', 'Following links, did you forget what you were looking for?'),
    W('검색은 끝이 없지만, 궁금증은 걷다 보면 풀리기도 해요.', 'Searching never ends, but some questions answer themselves on a walk.'),
    W('뉴스 새로고침은 불안을 새로고침하기도 해요.', 'Refreshing the news can refresh your anxiety too.'),
    W('댓글 창에 오래 머물수록 마음이 시끄러워져요.', 'The longer you stay in the comments, the noisier your mind gets.'),
    W('장바구니에 담는 순간의 설렘은 금방 사라져요.', 'The thrill of adding to cart fades fast.'),
    C('모든 답을 지금 알 필요는 없어요.', 'You don’t need every answer right now.'),
    C('오늘 하나 배웠다면, 그걸로 충분해요.', 'If you learned one thing today, that’s enough.'),
    C('모르는 걸 모른다고 말하는 것도 용기예요.', 'Saying “I don’t know” takes courage too.'),
    C('궁금한 게 많다는 건 멋진 일이에요. 직접 가보면 더 멋져요.', 'Curiosity is wonderful. Going to see for yourself is even better.'),
    O('검색창 대신 동네 골목을 탐색해 보세요.', 'Explore your neighborhood streets instead of the search bar.'),
    O('지도 앱 없이 걸어본 길이 진짜 내 길이 돼요.', 'The path you walk without a map app becomes truly yours.'),
    O('도서관 냄새는 검색 결과에 나오지 않아요.', 'The smell of a library doesn’t show up in search results.'),
    O('맛집 리뷰 대신 발길 닿는 가게에 들어가 보세요.', 'Skip the reviews and walk into whatever place calls to you.'),
    O('오늘의 북마크: 동네 공원 벤치.', 'Today’s bookmark: a bench in your local park.'),
    O('위키 대신 할머니께 옛날이야기를 여쭤보세요.', 'Instead of a wiki, ask your grandparents for a story.'),
  ],
  spotify: [
    C('좋은 음악은 산책을 더 길게 만들어요.', 'Good music makes a walk longer.'),
    C('오늘의 배경음악은 당신이 오르는 발소리예요.', 'Today’s soundtrack is your footsteps on the stairs.'),
    C('음악은 귀로 듣고, 풍경은 눈으로 보면 돼요.', 'Hear the music with your ears and see the view with your eyes.'),
    C('좋아하는 노래 한 곡이면 계단도 춤이 돼요.', 'With one favorite song, stairs become a dance.'),
    C('흥얼거리며 걷는 사람은 지치지 않아요.', 'People who hum while they walk don’t tire easily.'),
    C('플레이리스트를 만들 듯 하루를 골라 담아요.', 'Curate your day like a playlist.'),
    W('다음 곡 버튼을 누르는 손도 잠시 쉬어도 돼요.', 'Your skip-button thumb can take a break too.'),
    W('이어폰을 끼고 있어도 화면까지 볼 필요는 없어요.', 'Earbuds in doesn’t mean eyes on the screen.'),
    W('노래 한 곡을 끝까지 들어본 게 언제였나요?', 'When did you last listen to a song all the way through?'),
    W('하루 종일 이어폰을 끼면 내 생각의 소리가 묻혀요.', 'Earbuds all day can drown out your own thoughts.'),
    O('이어폰을 빼면 들리는 도시의 소리도 플레이리스트예요.', 'Take out your earbuds: the city’s sounds are a playlist too.'),
    O('오늘은 화면은 끄고, 음악만 켜고 걸어볼까요?', 'Today, screen off, music on, and walk.'),
    O('새소리와 바람 소리, 광고 없는 라이브예요.', 'Birdsong and wind: a live show with no ads.'),
    O('악기를 하나 배워보면 음악이 다르게 들려요.', 'Learn an instrument and music will sound different.'),
    O('친구와 노래방에 가서 크게 불러보세요.', 'Go to karaoke with friends and sing out loud.'),
    O('비 오는 날 창문을 열면 최고의 앰비언트가 들려요.', 'Open the window on a rainy day for the best ambient track.'),
  ],
  threads: [
    W('짧은 글이 끝없이 이어져요. 내 생각은 어디쯤 있나요?', 'Short posts go on forever. Where are your own thoughts?'),
    W('타임라인은 끝이 없지만, 오늘의 대화는 끝이 있어도 돼요.', 'The timeline is endless, but today’s conversation can end.'),
    W('남의 의견을 읽는 시간만큼 내 생각을 쓰는 시간도 있었나요?', 'Did you spend as much time thinking as reading others’ takes?'),
    W('논쟁 스레드에 머물수록 마음이 날카로워져요.', 'The longer you stay in heated threads, the sharper you get.'),
    W('답글을 기다리며 새로고침하는 손을 잠시 쉬어요.', 'Rest the hand that keeps refreshing for replies.'),
    W('모든 화제에 의견을 낼 필요는 없어요.', 'You don’t need an opinion on everything.'),
    W('오늘 읽은 글 중 기억나는 건 몇 개인가요?', 'How many posts you read today do you actually remember?'),
    C('오늘 떠오른 생각, 화면 말고 노트에 먼저 적어볼까요?', 'Write today’s idea in a notebook before posting it.'),
    C('반응 수와 상관없이 당신의 생각은 소중해요.', 'Your thoughts matter, whatever the reactions.'),
    C('긴 생각은 짧은 글보다 오래 남아요.', 'Long thoughts outlast short posts.'),
    C('조용히 생각하는 시간도 당신의 목소리예요.', 'Quiet thinking time is also your voice.'),
    C('공감 버튼보다 따뜻한 건 진짜 고개 끄덕임이에요.', 'A real nod is warmer than a like.'),
    O('스레드 밖에서 나누는 이야기는 끊기지 않아요.', 'Conversations outside the thread don’t get cut off.'),
    O('오늘 들은 가장 좋은 말은 화면 밖에서 왔나요?', 'Did the best thing you heard today come from off-screen?'),
    O('카페에서 친구와 한 시간 수다, 최고의 스레드예요.', 'An hour of chatting with a friend at a café: the best thread.'),
    O('일기장에 쓰는 한 줄은 아무도 평가하지 않아요.', 'Nobody rates a line in your diary.'),
    O('책 한 권은 천 개의 짧은 글보다 깊어요.', 'One book runs deeper than a thousand short posts.'),
  ],
  chrome: [
    W('탭이 몇 개 열려 있나요? 마음에도 탭이 쌓여요.', 'How many tabs are open? Your mind collects tabs too.'),
    W('새 탭을 여는 손을 멈추고, 지금 탭 하나에만 머물러 볼까요?', 'Stop opening new tabs and stay with just this one.'),
    W('링크를 따라가다 처음 찾던 걸 잊진 않았나요?', 'Following links, did you forget what you were looking for?'),
    W('“잠깐만 검색”이 한 시간이 되기도 해요.', '“A quick search” can become an hour.'),
    W('비교 탭이 열 개면, 결정은 더 어려워져요.', 'Ten comparison tabs make the decision harder.'),
    W('알림 허용 창에 “아니요”를 눌러도 괜찮아요.', 'It’s okay to click “Block” on notification requests.'),
    C('모든 답을 지금 알 필요는 없어요.', 'You don’t need every answer right now.'),
    C('필요한 것만 찾고 닫는 것, 그게 진짜 능력이에요.', 'Finding what you need and closing the tab is a real skill.'),
    C('탭을 하나 닫을 때마다 머리도 조금 가벼워져요.', 'Every closed tab makes your head a little lighter.'),
    O('검색창 대신 동네 골목을 탐색해 보세요.', 'Explore your neighborhood streets instead of the search bar.'),
    O('오늘의 방문 기록에 공원 하나를 더해보세요.', 'Add a park to today’s history.'),
    O('시크릿 모드 말고, 진짜 비밀 장소를 찾아가 보세요.', 'Forget incognito mode; go find a real secret spot.'),
    O('즐겨찾기한 여행지, 실제로 가보면 더 좋아요.', 'That bookmarked destination is better in person.'),
  ],
  chatgpt: [
    W('답을 빨리 얻는 것보다, 오래 생각하는 힘도 소중해요.', 'Thinking things through matters as much as getting quick answers.'),
    W('모든 질문을 바로 물어보면, 궁금해하는 즐거움이 짧아져요.', 'Asking everything right away cuts short the joy of wondering.'),
    W('대화가 편해도, 사람과의 대화를 대신할 수는 없어요.', 'However easy it is, it can’t replace talking with people.'),
    W('완벽한 답을 찾느라 시작을 미루고 있진 않나요?', 'Are you putting off starting while searching for the perfect answer?'),
    W('생각을 맡기기 전에 내 생각을 먼저 적어봐요.', 'Before handing off your thinking, write down your own first.'),
    C('질문을 잘하는 사람은 스스로 답도 찾아요.', 'People who ask good questions find their own answers too.'),
    C('오늘 스스로 풀어낸 문제 하나, 그게 진짜 실력이에요.', 'One problem you solved yourself today is real skill.'),
    C('틀려도 괜찮아요. 직접 해본 사람만 틀릴 수 있어요.', 'Being wrong is fine. Only those who try can be wrong.'),
    C('도구를 잘 쓰는 사람은 도구를 내려놓을 때도 알아요.', 'Those who use tools well also know when to put them down.'),
    O('가장 좋은 아이디어는 산책 중에 떠오르기도 해요.', 'The best ideas often show up on a walk.'),
    O('사람에게 직접 물어보면 답과 함께 대화가 생겨요.', 'Ask a person, and you get a conversation along with the answer.'),
    O('종이와 연필로 생각을 그려보세요. 손이 생각을 도와요.', 'Sketch your thoughts with pen and paper. Your hands help you think.'),
    O('모르는 길은 지나가는 사람에게 물어봐요.', 'Lost? Ask someone passing by.'),
  ],
  appstore: [
    W('새 앱을 찾는 시간, 새 산책길을 찾는 데 써볼까요?', 'Spend the time you’d use finding apps on finding a new walking path.'),
    W('설치는 1초, 그 앱이 가져갈 시간은 몇 시간일까요?', 'Installing takes a second. How many hours will the app take?'),
    W('무료 앱은 대신 당신의 시간을 받아가요.', 'Free apps get paid in your time.'),
    W('업데이트 알림보다 내 마음 업데이트가 먼저예요.', 'Update your mind before your apps.'),
    C('안 쓰는 앱을 지우면 홈 화면도, 마음도 가벼워져요.', 'Delete unused apps and both your home screen and mind feel lighter.'),
    C('꼭 필요한 앱만 남기는 것도 멋진 정리예요.', 'Keeping only the apps you need is a great tidy-up.'),
    O('오늘 추천 앱: 창문 열기.', 'Today’s featured app: open the window.'),
    O('새 앱 대신 새 취미를 내려받아 보세요.', 'Download a new hobby instead of a new app.'),
    O('가장 오래 쓰는 앱은 운동화일지도 몰라요.', 'Your most-used app might be your sneakers.'),
  ],
  tiktok: [
    W('15초씩 넘기다 보면 한 시간이 사라져요.', 'Fifteen seconds at a time, an hour disappears.'),
    W('끝없는 위로 넘기기, 진짜 위로는 아니에요.', 'Endless swiping up isn’t really lifting you up.'),
    W('다음 영상이 더 재밌을 거라는 기대가 손가락을 붙잡아요.', 'The hope that the next video is better keeps your thumb hooked.'),
    W('짧은 영상에 익숙해지면 긴 이야기가 지루해져요.', 'Get used to short clips and long stories start to feel boring.'),
    C('유행을 따라가지 않아도 당신은 충분히 재밌어요.', 'You’re fun enough without following every trend.'),
    C('따라 추던 춤, 오늘은 친구와 직접 춰볼까요?', 'That dance you keep watching: try it with a friend today.'),
    O('오늘의 챌린지: 화면 없이 15분 걷기.', 'Today’s challenge: a 15-minute walk without a screen.'),
    O('15초 대신 15분, 하늘을 보세요.', 'Instead of 15 seconds, look at the sky for 15 minutes.'),
  ],
  netflix: [
    W('“다음 화 재생”이 새벽을 데려와요.', '“Next episode” brings the dawn.'),
    W('보고 싶은 작품을 고르다 한 시간이 지나기도 해요.', 'Sometimes choosing what to watch takes an hour.'),
    C('정주행보다 멋진 건 오늘 하루를 끝까지 사는 거예요.', 'Better than binge-watching: living today all the way through.'),
    O('드라마 속 바다 말고, 진짜 바다를 보러 가요.', 'Go see the real sea, not the one in the show.'),
    O('친구와 영화관에 가면 같은 장면에서 함께 웃어요.', 'At the cinema with friends, you laugh at the same scene together.'),
  ],
  etc: [
    W('잠금화면을 하루에 몇 번 켜는지 세어본 적 있나요?', 'Have you ever counted how many times you wake your lock screen?'),
    W('앱 아이콘의 빨간 숫자는 당신을 부르려고 만들어졌어요.', 'Those red badges were designed to call you back.'),
    W('할 일이 없어서 폰을 켰는지, 폰을 켜서 할 일이 없어졌는지.', 'Did you pick up your phone because you were bored, or get bored because you picked it up?'),
    W('알림을 하나 끄면 하루가 조금 조용해져요.', 'Turn off one notification and your day gets a little quieter.'),
    W('폰을 침대 밖에 두면 아침이 달라져요.', 'Keep your phone out of bed and your mornings change.'),
    W('이유 없이 폰을 켰다면, 잠깐 이유를 물어봐요.', 'If you unlocked your phone for no reason, ask yourself why.'),
    C('앱을 닫는 것도 하나의 선택이에요.', 'Closing an app is a choice too.'),
    C('오늘 화면을 조금 덜 봤다면, 그건 작은 승리예요.', 'A little less screen today is a small win.'),
    C('스스로 멈출 줄 아는 사람이 진짜 강한 사람이에요.', 'Knowing when to stop is real strength.'),
    C('어제보다 한 걸음, 그거면 충분해요.', 'One step beyond yesterday is enough.'),
    O('홈 화면 대신 진짜 집 앞 풍경을 볼 시간이에요.', 'Time to look at the view outside your real home, not your home screen.'),
    O('충전기 대신 나를 충전해요. 햇볕으로.', 'Recharge yourself, not your phone. With sunshine.'),
    O('폰을 두고 나가면 주머니도, 마음도 가벼워요.', 'Leave your phone behind and your pocket and mind feel lighter.'),
    O('오늘은 화면 대신 사람의 얼굴을 오래 봐요.', 'Today, look at faces longer than screens.'),
  ],
};

/** 공통 문구 */
const COMMON: Entry[] = [
  // 응원
  C('잘하고 있어요. 한 층 한 층이 진짜 움직임이에요.', 'You’re doing great. Every floor is real movement.'),
  C('숨이 차다면, 지금 살아 있다는 뜻이에요.', 'Out of breath? That means you’re alive.'),
  C('여기까지 온 당신, 스크롤보다 강해요.', 'You made it this far. You’re stronger than the scroll.'),
  C('쉬어 가도 괜찮아요. 계단은 기다려 줘요.', 'Take a break. The stairs will wait.'),
  C('느려도 괜찮아요. 멈추지만 않으면 돼요.', 'Slow is fine, as long as you don’t stop.'),
  C('오늘의 나에게 박수 한 번.', 'A round of applause for today’s you.'),
  C('다리가 무거워도 마음은 가벼워지는 중이에요.', 'Your legs may be heavy, but your mind is getting lighter.'),
  C('어제의 나보다 몇 층 더 높이 와 있어요.', 'You’re a few floors higher than yesterday’s you.'),
  C('이 계단은 당신이 쓴 시간으로 만들어졌어요. 그리고 지금 넘고 있어요.', 'These stairs are built from your screen time, and you’re climbing past it.'),
  C('천천히 가도 결국 꼭대기에 닿아요.', 'Go slowly and you’ll still reach the top.'),
  C('오늘 이렇게 움직인 것만으로도 충분히 멋져요.', 'Just moving like this today is pretty great.'),
  C('조금 지쳤다면, 그만큼 많이 왔다는 뜻이에요.', 'A little tired means you’ve come a long way.'),
  C('당신은 생각보다 훨씬 꾸준한 사람이에요.', 'You’re far more persistent than you think.'),
  C('계단 하나에 한 번씩, 스스로를 칭찬해 주세요.', 'Praise yourself once for every step.'),
  C('남과 비교하지 말고, 지나온 층수만 세어봐요.', 'Don’t compare. Just count the floors behind you.'),
  C('방금 오른 층은 아무도 대신 올라줄 수 없었어요.', 'Nobody could have climbed that floor for you.'),
  C('잘하고 있다는 말, 오늘은 스스로에게 해줘요.', 'Today, tell yourself you’re doing well.'),
  C('발걸음 소리가 꽤 씩씩하네요.', 'Your footsteps sound pretty determined.'),
  C('포기하지 않는 마음, 그게 제일 높은 층이에요.', 'Not giving up is the highest floor of all.'),
  C('조금만 더. 위에서 바람이 기다려요.', 'Just a bit more. The breeze is waiting up top.'),
  C('오늘의 작은 결심이 내일의 습관이 돼요.', 'Today’s small decision becomes tomorrow’s habit.'),
  C('완벽하지 않아도 계속하는 사람이 결국 닿아요.', 'Those who keep going, imperfectly, get there in the end.'),
  C('심장이 뛰는 소리, 오늘의 배경음악이에요.', 'Your heartbeat is today’s soundtrack.'),
  C('한 층 오를 때마다 화면 속 내가 조금씩 작아져요.', 'With every floor, your on-screen self gets a little smaller.'),
  C('당신의 속도가 정답이에요.', 'Your pace is the right pace.'),
  C('계단을 오르는 지금, 아무 알림도 당신을 이길 수 없어요.', 'Right now, on these stairs, no notification can beat you.'),
  C('이렇게 높이 올라온 사람, 흔하지 않아요.', 'Not many people climb this high.'),
  C('잘 쉬는 것도 잘 오르는 방법이에요.', 'Resting well is part of climbing well.'),
  C('오늘의 당신, 꽤 괜찮은 사람이에요.', 'Today’s you is a pretty great person.'),
  C('작은 걸음이 모여 큰 풍경을 만나요.', 'Small steps add up to a big view.'),
  // 도파민 경고
  W('도파민은 ‘더’를 원하지만, ‘충분’은 당신이 정할 수 있어요.', 'Dopamine wants “more,” but you get to decide what’s “enough.”'),
  W('무한 스크롤은 무한한 만족이 아니에요.', 'Infinite scroll isn’t infinite satisfaction.'),
  W('짧은 자극이 계속되면, 긴 이야기가 지루해져요.', 'Constant quick hits make long stories feel dull.'),
  W('폰을 보고 싶은 충동은 파도처럼 왔다가 지나가요.', 'The urge to check your phone comes and goes like a wave.'),
  W('심심함을 참지 못하면, 생각할 틈도 사라져요.', 'If you never let yourself be bored, there’s no room to think.'),
  W('잠들기 전 화면 한 시간이 내일 아침을 무겁게 해요.', 'An hour of screen before bed makes tomorrow morning heavy.'),
  W('알림이 울릴 때마다 집중이 처음부터 다시 시작돼요.', 'Every notification resets your focus to zero.'),
  W('폰을 집어 드는 순간, 처음 하려던 일을 기억하나요?', 'When you picked up your phone, do you remember what you meant to do?'),
  W('“5분만”의 진짜 길이는 대개 30분이에요.', 'The real length of “just five minutes” is usually thirty.'),
  W('계속 확인해도 새로운 건 생각보다 많지 않아요.', 'Checking again and again rarely shows anything new.'),
  W('즐거움을 미리 다 써버리면, 정작 즐거운 일이 시시해져요.', 'Spend all your fun in advance and real fun starts to feel flat.'),
  W('화면은 밝지만, 눈은 쉬고 싶어 해요.', 'The screen is bright, but your eyes want a rest.'),
  W('지루함은 창의력이 시작되는 문이에요. 너무 빨리 닫지 마세요.', 'Boredom is the doorway to creativity. Don’t close it too fast.'),
  W('빨간 알림 배지는 급하다는 착각을 만들어요.', 'Red badges create a false sense of urgency.'),
  W('목이 앞으로 기울어 있다면, 지금 고개를 들 시간이에요.', 'If your neck is bent forward, it’s time to look up.'),
  W('스크롤하는 엄지는 하루에 몇 미터나 달릴까요?', 'How many meters does your scrolling thumb run each day?'),
  W('폰을 내려놓으면 처음 몇 분은 허전해요. 그다음이 진짜예요.', 'The first few minutes without your phone feel empty. What comes next is the real thing.'),
  W('좋아요를 기다리는 마음은 쉽게 채워지지 않아요.', 'The hunger for likes is hard to fill.'),
  W('보상이 빠를수록 더 자주 찾게 돼요. 그게 설계예요.', 'The faster the reward, the more often you come back. That’s by design.'),
  W('같은 앱을 여닫기를 반복하고 있다면, 잠깐 멈춰봐요.', 'If you keep opening and closing the same app, pause for a moment.'),
  W('불안할 때 켠 화면은 불안을 덜어주지 않아요.', 'A screen opened out of anxiety doesn’t ease it.'),
  W('밥 먹을 때만큼은 화면 말고 맛을 봐요.', 'At least at meals, taste the food instead of the screen.'),
  W('침대 위의 폰은 잠을 조금씩 훔쳐 가요.', 'A phone in bed steals your sleep bit by bit.'),
  W('대기 시간마다 폰을 꺼내면, 생각할 시간이 사라져요.', 'Pull out your phone at every pause and your thinking time disappears.'),
  W('화면 시간이 늘면 대화 시간이 줄어들기 쉬워요.', 'More screen time often means less talking time.'),
  W('무언가를 놓칠까 봐 보는 동안, 지금을 놓치고 있어요.', 'While you watch so you won’t miss out, you’re missing now.'),
  W('끝까지 내려도 바닥은 없어요. 멈추는 건 당신이에요.', 'There’s no bottom to the feed. Stopping is up to you.'),
  W('폰을 보지 않는 시간이 길어질수록, 보고 싶은 마음도 줄어요.', 'The longer you go without your phone, the less you want it.'),
  W('알림 하나에 반응하는 데 몇 초, 다시 집중하는 데는 훨씬 더 걸려요.', 'Reacting to a notification takes seconds. Refocusing takes much longer.'),
  W('오늘 가장 오래 본 화면, 정말 보고 싶었던 건가요?', 'The screen you stared at longest today: did you really want to?'),
  // 바깥
  O('고개를 들면 하늘이 있어요. 늘 거기 있었어요.', 'Look up and there’s the sky. It was always there.'),
  O('폰을 내려놓으면, 다른 세계가 보여요.', 'Put your phone down and another world appears.'),
  O('알림 없는 오후는 생각보다 넓어요.', 'An afternoon without notifications is wider than you think.'),
  O('화면은 손바닥만 하지만, 바깥은 끝이 없어요.', 'The screen fits in your palm; the world outside never ends.'),
  O('오늘 본 것 중 가장 좋았던 건 화면 밖에 있었나요?', 'Was the best thing you saw today outside the screen?'),
  O('창밖의 계절은 기다려 주지 않아요.', 'The season outside your window won’t wait.'),
  O('나무 그늘 아래 십 분, 어떤 영상보다 개운해요.', 'Ten minutes under a tree beats any video for feeling refreshed.'),
  O('오늘 하늘은 무슨 색이었나요?', 'What color was the sky today?'),
  O('바람이 부는 방향을 느껴본 적 있나요?', 'Have you felt which way the wind is blowing?'),
  O('발밑의 흙길도 꽤 좋은 콘텐츠예요.', 'The dirt path under your feet is pretty good content.'),
  O('해 질 녘 하늘은 매일 새로 개봉해요.', 'The sunset sky premieres something new every day.'),
  O('동네 고양이와 눈인사를 나눠보세요.', 'Exchange a nod with a neighborhood cat.'),
  O('비 냄새, 풀 냄새, 빵 냄새. 화면은 냄새를 못 전해요.', 'Rain, grass, fresh bread: screens can’t share smells.'),
  O('오늘 저녁엔 별을 세어볼까요?', 'How about counting stars tonight?'),
  O('걷다 보면 생각이 정리되고, 정리된 생각은 가벼워요.', 'Walking sorts your thoughts, and sorted thoughts feel light.'),
  O('좋아하는 사람과 같은 방향을 보며 걷는 시간.', 'Walking side by side with someone you like, looking the same way.'),
  O('폰을 두고 나간 산책에서 가장 많은 걸 발견해요.', 'You discover the most on walks without your phone.'),
  O('계절이 바뀌는 소리를 들어보세요.', 'Listen to the sound of the season changing.'),
  O('오늘은 처음 가보는 골목으로 돌아가 볼까요?', 'Today, take a street you’ve never walked.'),
  O('손에 쥐고 있던 걸 내려놓으면 누군가의 손을 잡을 수 있어요.', 'Let go of what’s in your hand and you can hold someone’s.'),
  O('화면 너머가 아니라, 창문 너머를 봐요.', 'Look through the window, not through the screen.'),
  O('아무것도 하지 않는 시간도 꼭 필요해요.', 'Time spent doing nothing is necessary too.'),
  O('햇볕을 쬐는 십 분이 기분을 바꿔요.', 'Ten minutes in the sun can change your mood.'),
  O('오늘은 지도 없이 걸어볼까요?', 'How about walking without a map today?'),
  O('나무를 한 그루 골라 이름을 붙여줘요.', 'Pick a tree and give it a name.'),
  O('누군가에게 직접 안부를 물어보세요.', 'Ask someone how they’re doing, in person.'),
  O('강가에 앉아 물소리를 들어보세요.', 'Sit by the river and listen to the water.'),
  O('새로운 레시피 하나, 직접 만들어 먹어요.', 'Try a new recipe and cook it yourself.'),
  O('책 한 권 들고 공원에 가요.', 'Take a book to the park.'),
  O('운동화 끈을 묶는 순간, 하루가 달라져요.', 'The moment you tie your sneakers, the day changes.'),
  O('이 계단 끝에는 화면보다 넓은 하늘이 있어요.', 'At the end of these stairs is a sky wider than any screen.'),
  O('오늘 밤엔 폰을 다른 방에 두고 자보세요.', 'Tonight, leave your phone in another room when you sleep.'),
  O('어릴 적 좋아하던 놀이를 다시 해보는 건 어때요?', 'How about playing a game you loved as a kid?'),
  O('하늘을 올려다보는 사람은 길을 잃지 않아요.', 'People who look up at the sky don’t lose their way.'),
  // 명언·속담
  Q('천 리 길도 한 걸음부터.', 'A journey of a thousand miles begins with a single step.', '노자', 'Lao Tzu'),
  Q('우리가 하루를 보내는 방식이 곧 삶을 보내는 방식이다.', 'How we spend our days is, of course, how we spend our lives.', '애니 딜러드', 'Annie Dillard'),
  Q('삶이 짧은 게 아니라, 우리가 많이 낭비하는 것이다.', 'It is not that we have a short time to live, but that we waste a lot of it.', '세네카', 'Seneca'),
  Q('삶을 미루는 사이, 삶은 지나간다.', 'While we are postponing, life speeds by.', '세네카', 'Seneca'),
  Q('지금 바로 살기 시작하라.', 'Begin at once to live.', '세네카', 'Seneca'),
  Q('인간의 불행은 방 안에 조용히 머물지 못하는 데서 온다.', 'All of humanity’s problems stem from our inability to sit quietly in a room alone.', '파스칼', 'Blaise Pascal'),
  Q('나의 경험은 내가 주의를 기울이기로 한 것들이다.', 'My experience is what I agree to attend to.', '윌리엄 제임스', 'William James'),
  Q('정보가 넘치면 주의력이 가난해진다.', 'A wealth of information creates a poverty of attention.', '허버트 사이먼', 'Herbert Simon'),
  Q('진정으로 위대한 생각은 모두 걷는 중에 떠오른다.', 'All truly great thoughts are conceived while walking.', '니체', 'Friedrich Nietzsche'),
  Q('무엇보다, 걷고 싶은 마음을 잃지 마라.', 'Above all, do not lose your desire to walk.', '키르케고르', 'Søren Kierkegaard'),
  Q('산이 부르니, 나는 가야 한다.', 'The mountains are calling and I must go.', '존 뮤어', 'John Muir'),
  Q('자연 속을 걸을 때마다 우리는 찾던 것보다 더 많은 것을 얻는다.', 'In every walk with nature one receives far more than he seeks.', '존 뮤어', 'John Muir'),
  Q('나는 의도적으로 살고 싶어서 숲으로 갔다.', 'I went to the woods because I wished to live deliberately.', '헨리 데이비드 소로', 'Henry David Thoreau'),
  Q('바쁜 것만으로는 부족하다. 무엇 때문에 바쁜지가 중요하다.', 'It is not enough to be busy. The question is: what are we busy about?', '헨리 데이비드 소로', 'Henry David Thoreau'),
  Q('단 한 번뿐인 거칠고 소중한 삶으로 무엇을 할 건가요?', 'What is it you plan to do with your one wild and precious life?', '메리 올리버', 'Mary Oliver'),
  Q('나는 걸을 때만 사색할 수 있다.', 'I can only meditate when I am walking.', '장 자크 루소', 'Jean-Jacques Rousseau'),
  Q('걷기는 사람에게 가장 좋은 약이다.', 'Walking is man’s best medicine.', '히포크라테스', 'Hippocrates'),
  Q('행복한 삶에 필요한 것은 아주 적다.', 'Very little is needed to make a happy life.', '마르쿠스 아우렐리우스', 'Marcus Aurelius'),
  Q('잃어버린 시간은 다시 찾을 수 없다.', 'Lost time is never found again.', '벤저민 프랭클린', 'Benjamin Franklin'),
  Q('오늘을 붙잡아라.', 'Seize the day.', '호라티우스', 'Horace'),
  Q('자연의 속도를 따르라. 그 비밀은 인내다.', 'Adopt the pace of nature: her secret is patience.', '랠프 월도 에머슨', 'Ralph Waldo Emerson'),
  Q('대지의 아름다움을 바라보는 사람은 삶이 다할 때까지 지속될 힘을 얻는다.', 'Those who contemplate the beauty of the earth find reserves of strength that will endure as long as life lasts.', '레이철 카슨', 'Rachel Carson'),
  Q('발로 대지에 입 맞추듯 걸어라.', 'Walk as if you are kissing the Earth with your feet.', '틱낫한', 'Thich Nhat Hanh'),
  Q('한 알의 모래에서 세계를 보라.', 'To see a World in a Grain of Sand.', '윌리엄 블레이크', 'William Blake'),
  Q('쉼은 게으름이 아니다.', 'Rest is not idleness.', '존 러벅', 'John Lubbock'),
  Q('성찰하지 않는 삶은 살 가치가 없다.', 'The unexamined life is not worth living.', '소크라테스', 'Socrates'),
  Q('시작이 반이다.', 'Well begun is half done.', '속담', 'Proverb'),
  Q('티끌 모아 태산.', 'Little by little, a little becomes a lot.', '속담', 'Proverb'),
  Q('백 번 듣는 것이 한 번 보는 것만 못하다.', 'Seeing once is better than hearing a hundred times.', '속담', 'Proverb'),
];

/** 진행 단계별로 우선할 종류: 초반 응원, 중반 경고, 후반 바깥·명언 */
function preferredKinds(ratio: number): MessageKind[] {
  if (ratio < 0.25) return ['cheer', 'warn', 'cheer', 'quote', 'outside'];
  if (ratio < 0.6) return ['warn', 'cheer', 'warn', 'quote', 'outside'];
  if (ratio < 0.85) return ['outside', 'warn', 'quote', 'cheer'];
  return ['outside', 'quote', 'outside', 'cheer'];
}

function hashStr(s: string) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffled<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let x = seed || 1;
  for (let i = a.length - 1; i > 0; i--) { x = (Math.imul(x, 1103515245) + 12345) >>> 0; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const TOP: Entry = O('이 문 너머가 옥상이에요. 화면보다 넓은 세상이 기다려요.', 'The rooftop is just beyond this door. A world wider than any screen is waiting.');
const cache = new Map<string, Entry[]>();

/**
 * 건물 하나의 층별 문구 순서(결정적). 홀수 층은 앱 문구, 짝수 층은 공통 문구를 우선하고
 * 진행 단계에 맞는 종류를 고르며, 두 묶음이 모두 떨어지기 전에는 같은 문구를 다시 쓰지 않는다.
 */
function sequenceFor(appId: string, floors: number): Entry[] {
  const key = `${appId}|${floors}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const seed = hashStr(appId);
  const ownAll = APP[appId] ?? APP.etc;
  let own = shuffled(ownAll, seed);
  let common = shuffled(COMMON, seed + 7);
  const seq: Entry[] = [];
  const take = (pool: Entry[], kind: MessageKind) => {
    const i = pool.findIndex((x) => x.kind === kind);
    return pool.splice(i >= 0 ? i : 0, 1)[0];
  };
  for (let f = 0; f <= floors; f++) {
    if (f < 2 || f >= floors) { seq.push(TOP); continue; }
    if (own.length === 0 && common.length === 0) { own = shuffled(ownAll, seed + f); common = shuffled(COMMON, seed + f + 7); }
    const ratio = floors > 1 ? (f - 1) / (floors - 1) : 0;
    const kinds = preferredKinds(ratio);
    const want = kinds[Math.floor(f / 2) % kinds.length];
    const first = f % 2 === 1 ? own : common;
    const second = first === own ? common : own;
    let msg = first.length ? take(first, want) : take(second, want);
    if (seq.length && seq[seq.length - 1].ko === msg.ko && (first.length || second.length)) msg = take(first.length ? first : second, want);
    seq.push(msg);
  }
  cache.set(key, seq);
  return seq;
}

/** 층별 문구 (같은 앱·층이면 항상 같은 문구) */
export function messageFor(appId: string, floor: number, floors: number, l: Locale = getLocale()): WallMessage {
  if (floor >= floors) return pick(TOP, l);
  return pick(sequenceFor(appId, floors)[Math.max(2, floor)], l);
}

/** 로비 환영 문구 */
export const lobbyMessage = (towerName: string, floors: number, l: Locale = getLocale()) => tr(l).lobbyMessage(towerName, floors);

export const allMessagesFor = (appId: string, l: Locale = getLocale()) => [...(APP[appId] ?? APP.etc), ...COMMON].map((e) => pick(e, l));
export const messageCounts = () => ({ common: COMMON.length, apps: Object.fromEntries(Object.entries(APP).map(([k, v]) => [k, v.length])) });
