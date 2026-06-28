**Description**  
For page navigation I built a working 3-to-8 binary decoder with 5 outputs wired; each button encodes a number, clicking a button drives its number's bitstream into real inverter +AND gate logic for decoding, which produces a one-hot output that drives the page change.
  
**Directory Structure**
- index.html        #Homepage
- projects.html     #Projects (highlighted work)
- resume.html       #Resume
- blog.html         #General Writing (will fill with blog + commentary posts)
- contact.html      #Different methods of contact
  - assets/
    - css/
      - variables.css   #Design
      - base.css        #Reset & shared elements
      - home.css        #Homepage layout
      - page.css        #General secondary page layout
    - fonts/
    - images/
    - js/
      - main.js         #Micro shared behaviour
