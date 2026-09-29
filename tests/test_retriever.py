from src.retrieval.retriever import retrieve, is_relevant

def test_relevant_query():
    ctx = retrieve("how much sugar per day")
    assert max(ctx.scores) >= 0.35

def test_filtered_stays_in_doc():
    ctx = retrieve("vegetables", filter_doc="The Eatwell Guide")
    assert all(c.document_name == "The Eatwell Guide" for c in ctx.chunks)

def test_irrelevant_query():
    ctx = retrieve("history of ancient rome")
    assert not is_relevant(ctx)
