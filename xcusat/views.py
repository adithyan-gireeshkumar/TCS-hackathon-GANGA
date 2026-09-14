from django.shortcuts import render, get_object_or_404, redirect
from .models import Chat, Message
import os
from ollama import Client



def home(request):
    chats = Chat.objects.all().order_by("-updated_at")

    chat_id = request.GET.get("chat")

    if chat_id:
        current_chat = get_object_or_404(Chat, id=chat_id)
    else:
        current_chat = None

    if request.method == "POST":
        question = request.POST.get("question", "").strip()

        if question:
            if current_chat is None:
                current_chat = Chat.objects.create(
                    title=question[:50]
                )

            Message.objects.create(
                chat=current_chat,
                role="user",
                content=question
            )

            previous_messages = Message.objects.filter(
                chat=current_chat
            ).order_by("created_at")

            ollama_messages = []

            for message in previous_messages:
                ollama_messages.append({
                    "role": message.role,
                    "content": message.content
                })

            client = Client(host=os.environ.get("OLLAMA_HOST", "http://localhost:11434"))
            response = client.chat(
                model=os.environ.get("OLLAMA_MODEL", "gemma4:cloud"),
                messages=ollama_messages
            )

            answer = response["message"]["content"]

            Message.objects.create(
                chat=current_chat,
                role="assistant",
                content=answer
            )

            return redirect("/?chat=" + str(current_chat.id))

    messages = []

    if current_chat:
        messages = Message.objects.filter(
            chat=current_chat
        ).order_by("created_at")

    return render(
        request,
        "xcusat/home.html",
        {
            "chats": chats,
            "current_chat": current_chat,
            "messages": messages,
        }
    )


def new_chat(request):
    new_chat = Chat.objects.create(
        title="New Chat"
    )

    return redirect("/?chat=" + str(new_chat.id))


def delete_chat(request, chat_id):
    selected_chat = get_object_or_404(
        Chat,
        id=chat_id
    )

    selected_chat.delete()

    return redirect("/")