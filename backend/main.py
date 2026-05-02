from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
import os, requests, json, random
from fastapi.middleware.cors import CORSMiddleware
from database import collection
from datetime import datetime

load_dotenv()

app = FastAPI(title="QuizVerse AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")


class QuizRequest(BaseModel):
    text: str
    difficulty: str = "easy"


def shuffle_options(questions: list) -> list:
    for q in questions:
        correct = q["correct"]
        opts = q["options"][:]
        random.shuffle(opts)
        q["options"] = opts
        q["correct"] = correct
    return questions


def parse_correct(q: dict) -> dict:
    correct = q.get("correct", "")
    if len(correct) == 1 and correct.upper() in "ABCD":
        idx = ord(correct.upper()) - ord("A")
        if 0 <= idx < len(q["options"]):
            q["correct"] = q["options"][idx]
    return q


def build_prompt(topic: str, difficulty: str) -> str:
    diff_instructions = {
        "easy": "straightforward factual questions, basic concepts, beginner-friendly",
        "medium": "moderate complexity, conceptual understanding, some application",
        "hard": "challenging, deep knowledge, edge cases, expert-level thinking"
    }
    diff_desc = diff_instructions.get(difficulty, diff_instructions["easy"])

    return f"""Generate exactly 10 multiple choice quiz questions about: {topic}
Difficulty: {difficulty} ({diff_desc})

Rules:
- Return ONLY a raw JSON object. No markdown. No explanation. No backticks.
- Each question has exactly 4 options
- "correct" field must exactly match one of the 4 options (case-sensitive)
- Mix factual, conceptual and application-style questions
- All questions must be unique and relevant to the topic

Return this exact structure:
{{"questions":[{{"question":"...","options":["...","...","...","..."],"correct":"..."}}]}}"""


@app.post("/generate-quiz")
def generate_quiz(req: QuizRequest):
    models = [
        "anthropic/claude-3-haiku",
        "mistralai/mistral-7b-instruct",
        "meta-llama/llama-3-8b-instruct",
    ]

    last_error = None

    for model in models:
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://quizverse.ai",
                    "X-Title": "QuizVerse AI",
                },
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a quiz question generator. Always respond with valid JSON only. No markdown. No explanation."
                        },
                        {
                            "role": "user",
                            "content": build_prompt(req.text, req.difficulty)
                        }
                    ],
                    "temperature": 0.6,
                    "max_tokens": 2500,
                },
                timeout=40,
            )

            result = response.json()

            if "error" in result:
                print(f"[WARN] Model {model} error: {result['error']}")
                last_error = result["error"]
                continue

            if "choices" not in result or not result["choices"]:
                print(f"[WARN] No choices from {model}")
                continue

            content = result["choices"][0]["message"]["content"].strip()

            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            start = content.find("{")
            end = content.rfind("}") + 1
            if start == -1 or end == 0:
                print(f"[WARN] No JSON block found from {model}")
                continue

            json_text = content[start:end]

            json_text = (
                json_text
                .replace("\n", " ")
                .replace("\r", "")
                .replace("\u2018", "'").replace("\u2019", "'")
                .replace("\u201c", '"').replace("\u201d", '"')
            )

            data = json.loads(json_text)
            questions = data.get("questions", [])

            if len(questions) < 5:
                print(f"[WARN] Only {len(questions)} questions from {model}, trying next")
                continue

            valid = []
            for q in questions:
                if (
                    isinstance(q.get("question"), str) and
                    isinstance(q.get("options"), list) and
                    len(q["options"]) == 4 and
                    isinstance(q.get("correct"), str)
                ):
                    q = parse_correct(q)
                    if q["correct"] in q["options"]:
                        valid.append(q)

            if len(valid) < 5:
                print(f"[WARN] Only {len(valid)} valid questions from {model}")
                continue

            questions = shuffle_options(valid)
            print(f"[OK] Generated {len(questions)} questions using {model}")
            return {"questions": questions, "total": len(questions), "model": model}

        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON parse error from {model}: {e}")
            last_error = str(e)
        except requests.exceptions.Timeout:
            print(f"[ERROR] Timeout from {model}")
            last_error = "timeout"
        except Exception as e:
            print(f"[ERROR] Unexpected error from {model}: {e}")
            last_error = str(e)

    print(f"[ERROR] All models failed. Last error: {last_error}")
    return {
        "questions": [],
        "total": 0,
        "fallback": True,
        "error": f"AI generation failed: {last_error}"
    }


@app.post("/save-result")
def save_result(data: dict):
    try:
        # Each answer: { question, options, correct, selected, is_correct }
        record = {
            "username": data.get("username", "anonymous").strip().lower(),
            "topic": data.get("topic"),
            "difficulty": data.get("difficulty", "easy"),
            "score": data.get("score"),
            "attempted": data.get("attempted"),
            "correct": data.get("correct"),
            "percentage": data.get("percentage"),
            "total_questions": data.get("total_questions"),
            "time_taken": data.get("time_taken"),
            "answers": data.get("answers", []),  # full answer detail array
            "timestamp": datetime.utcnow(),
        }
        result = collection.insert_one(record)
        return {"message": "Result saved successfully", "id": str(result.inserted_id)}
    except Exception as e:
        print(f"[ERROR] Save result failed: {e}")
        return {"error": str(e)}


@app.get("/history/{username}")
def get_user_history(username: str):
    try:
        uname = username.strip().lower()
        results = list(
            collection.find({"username": uname}, {"_id": 0})
            .sort("timestamp", -1)
            .limit(20)
        )
        for r in results:
            if "timestamp" in r:
                r["timestamp"] = r["timestamp"].isoformat()
        return {"history": results, "username": uname, "total": len(results)}
    except Exception as e:
        return {"error": str(e)}


@app.get("/leaderboard")
def get_leaderboard():
    try:
        results = list(
            collection.find({}, {"_id": 0, "answers": 0})
            .sort("percentage", -1)
            .limit(10)
        )
        for r in results:
            if "timestamp" in r:
                r["timestamp"] = r["timestamp"].isoformat()
        return {"leaderboard": results}
    except Exception as e:
        return {"error": str(e)}


@app.get("/stats")
def get_stats():
    try:
        total_quizzes = collection.count_documents({})
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "avg_score": {"$avg": "$percentage"},
                    "total_quizzes": {"$sum": 1},
                    "perfect_scores": {
                        "$sum": {"$cond": [{"$eq": ["$percentage", 100]}, 1, 0]}
                    }
                }
            }
        ]
        agg = list(collection.aggregate(pipeline))
        stats = agg[0] if agg else {}
        stats.pop("_id", None)

        topic_pipeline = [
            {"$group": {"_id": "$topic", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_topics = list(collection.aggregate(topic_pipeline))

        return {
            "total_quizzes": total_quizzes,
            "avg_score": round(stats.get("avg_score", 0), 1),
            "perfect_scores": stats.get("perfect_scores", 0),
            "top_topics": [{"topic": t["_id"], "count": t["count"]} for t in top_topics]
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/health")
def health():
    return {"status": "ok", "service": "QuizVerse AI"}
