I have an idea that I would like to build a prototype for. Can you help me? First I would like to think through a abbreviated product spec, then use that to start building.

On large construction projects a Risk Register is sometimes developed among all the stakeholders to broadly do two things:
Identify the major risks and risk profile of the project so that mitigations etc. can be appropriately developed
Determine the amount of contingency to hold for the project.

Sometimes it is only used for the first objective above in a qualitative manner.

My product is a collaborative risk register platform that allows a facilitator to run a workshop to generate a table (practitioners like the look and feel of excel) of risks with probability of occurrence and cost of impact.
The probability can either by specific percentages (0-100) or qualitative bins (unlikely, likely, probably, etc), qualitative bins are presented by integers 1-5 who's definitions can be changed by the project team.
Cost of impact can also be specific dollar amounts (either a single value, or the min, expected, and max to represent a triangular distribution) or a 1-5 integer (defined by the project team).
The process is as follows:
start with a blank slate (table)
collaboratively populate this with one risk per row, each risk gets a probability and a cost. for a given register, either they will all have qualitative (1-5 for probability and cost) or quantitative (precise values)
there should be good version history and note taking ability to track changes made and record reasons for them.
there should be capability to add arbitrary sorting / grouping columns (for future analysis) where the user can provide lables / metadata to be able to bin risks flexibly later on.
each risk gets a unique ID

Once the register is developed, the user should be able to produce plots. There should be two options:
PDF/CDF's from a monte carlo analysis
is the risk register is quantitative (as described above) then a monte carlo can be performed. Data should be generated for each risk, then combined into a aggregate distribution to develop the pdf and cdf.
this needs to be optimized for performance, I want to be able to see immediate updates.

"heat map"
if the register is qualitative (1-5 integers) then a plot should be shown (I am unsure the actual name) with "probability" on the x axis and "cost" on the y axis. this plot will form a grid, within each grid combination (for example cost==1 and probability ==3) there will be a circle who's size represents the frequency of that combination in the register.

I want another table that is mitigations. where I can identify mitigations and have a many to many relationship between mitigations and risks. for each risk that a mitigation associated with (each one-to-one relationship) I need to be able to define the specific reduction in probability and/or cost associated with this.

both the mitigations and risk register should have tool tips that guide the users on how to appropriately develop items, eventually I would like to add functionality that more explicitly guides each items language (using an llm and the project documents).

I want the user to be able to make a lot of configuration changes, but for the software to be ready to go out of the box, so it needs to be opinionated with plenty of configuration options.

I want to develop a prototype level product spec for us to build from.
Big concerns I have:
interface has to be excel-like (thinking something like Airtable) where an excel user feels very comfortable)
also like airtable i have to be able to control data types etc for each column (it has to be a database ready table)
One that note, should I just build this on top of airtable or something similar?
I really want to be able to focus on the collaboration aspect and being able to see how the risk profile changes over time.
for the workflow mentioned above, I would like to be able to update the register and save it as a state, then be able to look at state changes over time.
i do like plain text for future-proofing and data openness, but don't want to sacrifice high quality data structures. want specific suggestions on that.
eventually this needs to be behind credentials or a MS SSO option, so design needs to happen that keeps that open (though I don't think it will be a big issue)
I am most comfortable with python, so would like to stay in that ecosystem as much as possible, but want this to be good, so am open to any stack that might be most beneficial.
