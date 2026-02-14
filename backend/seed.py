"""Seed script: creates 10 realistic construction risks with comments and proposals."""

import httpx
import time

BASE = "http://localhost:8000/api/v1"

RISKS = [
    {
        "title": "Unexpected ground contamination",
        "description": "Potential for hazardous materials in soil requiring remediation before foundation work.",
        "category": "Geotechnical",
        "probability": 35,
        "cost_min": 200_000,
        "cost_expected": 500_000,
        "cost_max": 1_200_000,
        "notes": "Phase 1 ESA identified potential hotspots near old fuel storage.",
    },
    {
        "title": "Steel price escalation",
        "description": "Market volatility in structural steel could exceed budget allowance.",
        "category": "Procurement",
        "probability": 60,
        "cost_min": 150_000,
        "cost_expected": 400_000,
        "cost_max": 800_000,
        "notes": "Current futures trending upward. Lock in pricing by Q2.",
    },
    {
        "title": "Permit approval delays",
        "description": "Municipal permitting backlog may push start date for vertical construction.",
        "category": "Regulatory",
        "probability": 45,
        "cost_single": 350_000,
        "notes": "City planning dept understaffed. Pre-application meeting scheduled.",
    },
    {
        "title": "Subcontractor default",
        "description": "Key mechanical subcontractor showing signs of financial distress.",
        "category": "Procurement",
        "probability": 15,
        "cost_min": 500_000,
        "cost_expected": 1_500_000,
        "cost_max": 3_000_000,
        "notes": "Monitor monthly. Backup subs identified.",
    },
    {
        "title": "Design coordination clashes",
        "description": "MEP and structural clashes discovered late requiring rework.",
        "category": "Design",
        "probability": 70,
        "cost_min": 50_000,
        "cost_expected": 180_000,
        "cost_max": 400_000,
        "notes": "BIM coordination sessions underway but behind schedule.",
    },
    {
        "title": "Extreme weather delays",
        "description": "Unseasonable storms or heat waves halting outdoor work beyond contingency days.",
        "category": "Environmental",
        "probability": 25,
        "cost_single": 600_000,
        "notes": "Historical data suggests 8-12 lost days per year at this site.",
    },
    {
        "title": "Utility relocation complications",
        "description": "Existing underground utilities not matching as-built drawings.",
        "category": "Site Conditions",
        "probability": 50,
        "cost_min": 100_000,
        "cost_expected": 300_000,
        "cost_max": 700_000,
        "notes": "GPR survey planned for next month.",
    },
    {
        "title": "Labor shortage — skilled trades",
        "description": "Insufficient availability of electricians and pipefitters in local market.",
        "category": "Labor",
        "probability": 40,
        "cost_single": 450_000,
        "notes": "Competing projects in the region. May need travel labor premium.",
    },
    {
        "title": "Concrete supply chain disruption",
        "description": "Primary batch plant capacity constrained due to regional demand.",
        "category": "Procurement",
        "probability": 20,
        "cost_min": 80_000,
        "cost_expected": 200_000,
        "cost_max": 500_000,
        "notes": "Secondary supplier qualified but 30min further.",
    },
    {
        "title": "Scope creep from owner changes",
        "description": "Owner requesting additions to program without formal change orders.",
        "category": "Client",
        "probability": 55,
        "cost_min": 100_000,
        "cost_expected": 350_000,
        "cost_max": 900_000,
        "notes": "Change management process agreed but not consistently followed.",
    },
]

# Comments and proposals to add after risks are created.
# Each entry: (risk_index, column_key, comments_list)
# A comment with "proposed_value" is a proposal.
COMMENT_THREADS = [
    # Risk 0: Ground contamination — debate on probability
    (0, "probability", [
        {"author_name": "Sarah Chen", "content": "I think 35% is too low. The Phase 1 ESA flagged three potential hotspots and we haven't done soil borings yet."},
        {"author_name": "Mike Torres", "content": "Agreed, the fuel storage was decommissioned in the 80s with no records of cleanup.", "proposed_value": "50"},
        {"author_name": "Sarah Chen", "content": "50% feels right given the unknowns. We should update after the Phase 2 results come in."},
    ]),
    # Risk 0: Ground contamination — cost discussion
    (0, "cost", [
        {"author_name": "David Park", "content": "Max of $1.2M assumes partial remediation. Full excavation and disposal could be $2M+."},
        {"author_name": "Sarah Chen", "content": "Let's keep the current range for now and revisit after borings.", "proposed_value": '{"min": 200000, "expected": 500000, "max": 2000000}'},
    ]),
    # Risk 1: Steel prices — accepted proposal
    (1, "probability", [
        {"author_name": "Lisa Wang", "content": "With the new tariff announcements, I'd push this higher.", "proposed_value": "75"},
        {"author_name": "Mike Torres", "content": "That's aggressive but defensible given current market signals."},
    ]),
    # Risk 2: Permit delays — discussion
    (2, "cost", [
        {"author_name": "David Park", "content": "The $350K assumes 3 months delay. If it stretches to 6 months we're looking at $700K+ in carry costs."},
        {"author_name": "Lisa Wang", "content": "Should we model this as triangular instead of single value?"},
        {"author_name": "Sarah Chen", "content": "Good idea. Here's a proposed range.", "proposed_value": '{"min": 200000, "expected": 350000, "max": 750000}'},
    ]),
    # Risk 3: Subcontractor default — probability discussion
    (3, "probability", [
        {"author_name": "Mike Torres", "content": "Just heard their CFO resigned. We should bump this up."},
        {"author_name": "Sarah Chen", "content": "Let's move it to 25% and start engaging backup subs more seriously.", "proposed_value": "25"},
        {"author_name": "David Park", "content": "Makes sense. I'll set up calls with two alternates this week."},
    ]),
    # Risk 4: Design clashes — accepted proposal on cost
    (4, "cost", [
        {"author_name": "Lisa Wang", "content": "We've already found 40+ clashes in the latest model. The expected cost should be higher."},
        {"author_name": "Mike Torres", "content": "Updated estimate based on similar projects.", "proposed_value": '{"min": 75000, "expected": 250000, "max": 500000}'},
    ]),
    # Risk 5: Weather — notes discussion
    (5, "notes", [
        {"author_name": "David Park", "content": "We should add the climate projection data from the recent NOAA report."},
        {"author_name": "Sarah Chen", "content": "I'll pull the 10-year precipitation trends for this ZIP code."},
    ]),
    # Risk 7: Labor shortage — probability debate
    (7, "probability", [
        {"author_name": "Mike Torres", "content": "The electrical union just signed a big contract at the airport project. We're going to struggle.", "proposed_value": "60"},
        {"author_name": "Lisa Wang", "content": "60% might be right for electricians specifically, but pipefitters are more available."},
        {"author_name": "David Park", "content": "Split the difference — 50% captures the blended risk.", "proposed_value": "50"},
    ]),
    # Risk 9: Scope creep — probability accepted
    (9, "probability", [
        {"author_name": "Sarah Chen", "content": "The owner's PM keeps adding items in weekly meetings without paperwork."},
        {"author_name": "David Park", "content": "This is basically certain at this point.", "proposed_value": "70"},
        {"author_name": "Mike Torres", "content": "Agreed. We need to escalate the change management issue."},
    ]),
    # Risk 9: Scope creep — cost discussion
    (9, "cost", [
        {"author_name": "Lisa Wang", "content": "The max should reflect the full wish list they've been floating — closer to $1.5M."},
        {"author_name": "Sarah Chen", "content": "Here's an updated range based on the informal requests tracked so far.", "proposed_value": '{"min": 150000, "expected": 500000, "max": 1500000}'},
    ]),
]

# Which proposals to accept (by thread index)
ACCEPT_THREADS = [2, 5, 8]  # Steel probability, Design cost, Scope creep probability


def main():
    client = httpx.Client(timeout=10)

    # Get or create register
    registers = client.get(f"{BASE}/registers").json()
    if registers:
        reg_id = registers[0]["id"]
        # Delete existing risks to start fresh
        existing_risks = client.get(f"{BASE}/registers/{reg_id}/risks").json()
        for r in existing_risks:
            client.delete(f"{BASE}/risks/{r['id']}")
        print(f"Cleared {len(existing_risks)} existing risks from register {reg_id}")
    else:
        reg = client.post(f"{BASE}/registers", json={"name": "Highway Bridge Rehabilitation"}).json()
        reg_id = reg["id"]
        print(f"Created register: {reg_id}")

    # Create risks
    created_risks = []
    for risk_data in RISKS:
        r = client.post(f"{BASE}/registers/{reg_id}/risks", json=risk_data).json()
        created_risks.append(r)
        print(f"  Created {r['display_id']}: {r['title']}")

    # Add comments and proposals
    created_comments = {}  # thread_index -> list of comment objects
    for thread_idx, (risk_idx, col_key, comments) in enumerate(COMMENT_THREADS):
        risk_id = created_risks[risk_idx]["id"]
        created_comments[thread_idx] = []
        for comment in comments:
            c = client.post(f"{BASE}/risks/{risk_id}/comments", json={
                "column_key": col_key,
                **comment,
            }).json()
            created_comments[thread_idx].append(c)
            proposal_marker = " [PROPOSAL]" if comment.get("proposed_value") else ""
            print(f"  Comment on {created_risks[risk_idx]['display_id']}.{col_key}: {comment['author_name']}{proposal_marker}")

    # Accept selected proposals
    for thread_idx in ACCEPT_THREADS:
        # Find the last proposal in the thread
        proposals = [c for c in created_comments[thread_idx] if c.get("proposed_value")]
        if proposals:
            last_proposal = proposals[-1]
            client.post(f"{BASE}/comments/{last_proposal['id']}/accept").json()
            risk_idx = COMMENT_THREADS[thread_idx][0]
            col = COMMENT_THREADS[thread_idx][1]
            print(f"  Accepted proposal on {created_risks[risk_idx]['display_id']}.{col} by {last_proposal['author_name']}")

    print(f"\nDone! Created {len(created_risks)} risks with {sum(len(v) for v in created_comments.values())} comments.")
    print("Refresh your browser to see the data.")


if __name__ == "__main__":
    main()
