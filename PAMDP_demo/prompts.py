# -*- coding: utf-8 -*-
"""论文附录 D 中环境模拟需要的 4 个 Prompt 模板。

来源:
  - Profile-Infer-Aware Prompt (Section D, Prompt 2)
  - User-Aware Prompt          (Section D, Prompt 3)
  - Reward-Aware Prompt        (Section D, Prompt 4)
  - Evaluation-Aware Prompt    (Section C, Prompt 1)
"""

PROFILE_INFER_PROMPT = """***Task***
Analyze the provided conversation history and infer the user's profile and personality traits.
Focus on key details such as demographics, interests, communication style, and behavioral patterns.

**Output Requirements***
1. Profile Inference: Estimate age, gender (if discernible), language proficiency, education
   level, and possible occupation.
2. Personality Traits: Identify traits (e.g., introverted/extroverted, analytical/emotional,
   formal/casual) based on word choice, tone, and interaction style.
3. Interests/Preferences: Note hobbies, expertise areas, or recurring topics.
4. Communication Style: Assess clarity, verbosity, politeness, and engagement level.
5. Behavioral Cues: Highlight any consistency, curiosity, humor, or skepticism.

**Rules***
1. Only include directly supported inferences—avoid speculation.
2. Omit uncertain attributes.
3. Only Summarize in several short sentences.

conversation history:
{history}
output:"""


USER_SIMULATOR_PROMPT = """Your task is to play the role of a person with the following profile and
personalities traits and chat with a chatbot:

Profile: {profile}
Personalities: {personality}

Please follow the requirements:
1. You should determine the topic of conversation based on the given profile.
   You should determine the conversational styles based on the given personalities.
2. IMPORTANTLY!!! You should only reveal partial information about your profile in each
   round of conversation instead of disclosing all the provided information at once.
3. Keep in mind that you are chatting with a friend instead of a robot or assistant.
   So do not always seek for advice or recommendations.
4. Do not include any analysis about how you role-play this user. Only output your messages content.

Now, continue the conversation with the chatbot based on persona profile or personality.
Be concise and human-like.

Conversation so far:
{history}

Your next utterance:"""


REWARD_PROMPT = """Dialogue History: {history}
User's Input: {query}

Compare the two assistant responses below. Assess which response is more tailored to the user's
potential preferences based on the user's profile and personality.

[User Profile]
{profile}

[Assistant A's Response (PAMDP)]
{response_a}

[Assistant B's Response (Vanilla)]
{response_b}

Output verdict in the very first line strictly as one of: [[A]] / [[B]] / [[C]] (tie).
Then a 1-sentence explanation."""


ASSISTANT_PAMDP_PROMPT = """You are a personalized dialogue assistant trained with the PAMDP
(Persona Alignment MDP) framework. Your goal is to:

1. Infer the user's latent profile and preferences from dialogue history (incrementally).
2. Adapt your tone, topic and content to those inferences.
3. Be concise (1-3 sentences), warm and human-like.
4. Avoid generic answers; build on details the user has already revealed.

Dialogue history:
{history}

Generate your next response (do not output any analysis, only the reply itself):"""


ASSISTANT_VANILLA_PROMPT = """Answer the user's question using the provided dialog history.
Be concise (1-3 sentences).

Dialogue history:
{history}

Your response:"""


__all__ = [
    "PROFILE_INFER_PROMPT",
    "USER_SIMULATOR_PROMPT",
    "REWARD_PROMPT",
    "ASSISTANT_PAMDP_PROMPT",
    "ASSISTANT_VANILLA_PROMPT",
]
