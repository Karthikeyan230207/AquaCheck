from typing import Any


def load_local_model(model_path: str) -> tuple[Any, Any]:
	"""Load an explicitly configured, already-downloaded Transformers model."""
	try:
		from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
	except ImportError as error:
		raise RuntimeError("Install transformers and torch to enable local AI explanations") from error

	tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
	model = AutoModelForSeq2SeqLM.from_pretrained(model_path, local_files_only=True)
	return tokenizer, model


def generate_local_explanation(prompt: str, model_path: str) -> str:
	"""Generate an explanation with a model already present on the local machine."""
	try:
		import torch
	except ImportError as error:
		raise RuntimeError("Install torch to enable local AI explanations") from error

	tokenizer, model = load_local_model(model_path)
	model.eval()
	encoded = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
	with torch.inference_mode():
		generated = model.generate(**encoded, max_new_tokens=160)
	return tokenizer.decode(generated[0], skip_special_tokens=True).strip()
