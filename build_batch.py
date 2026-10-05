import subprocess, os, json, glob, sys
from PIL import Image
U='/root/.claude/uploads/a51ce13b-e88e-5c56-9d77-f6f1d1200f48/'
R='/home/claude/collage/'
def src(p): return glob.glob(U+p+'*')[0]
os.makedirs(R+'images/cutouts',exist_ok=True); os.makedirs(R+'images/studio',exist_ok=True)
def run(mode,p,id_,crop=None,extra=()):
    out=f'{R}images/cutouts/{id_}.webp'
    cmd=['python3',R+'tools/cutout.py',mode,src(p),out]+(['--crop',crop] if crop else [])+list(extra)
    subprocess.run(cmd,check=True,capture_output=True)
    im=Image.open(out); return im.size
# (group, id, title, tags, mode, src, crop, extra)
C=[
("figures","angel-palm-cut","Angel With Palm",["statue","wings","stone"],"photo","bb3a9122",None,[]),
("figures","bride-cut","Bride, Mossed",["bride","face","moss","veil"],"photo","9352edbe",None,["--model","isnet-general-use"]),
("figures","young-man-cut","Young Man, Cut Close",["portrait","face","man"],"photo","b4d1c266","0,0,1,0.9",["--model","isnet-general-use"]),
("figures","astronauts-cut","Two Astronauts",["astronaut","suit","resting"],"photo","02b65034","0.42,0.62,0.65,0.85",["--model","isnet-general-use"]),
("things","gate-cut","Gate With No Wall",["arch","gate","stone","ruin"],"photo","8a645097",None,["--model","isnet-general-use"]),
("things","arch-round-cut","Arch, Broken",["arch","ruin","stone"],"photo","c132440f",None,["--model","isnet-general-use"]),
("things","arch-bend-cut","Arch, Leaning Over",["arch","stone","curve"],"photo","74c12319",None,["--model","isnet-general-use"]),
("things","specimen-heron","Heron, Plate",["bird","heron","engraving"],"rect","6a1122c6","42,42,340,460",[]),
("things","specimen-snake","Snake, Plate",["snake","engraving"],"rect","6a1122c6","396,58,728,424",[]),
("things","specimen-crab","Crab, Plate",["crab","engraving"],"rect","6a1122c6","406,498,726,804",[]),
("things","specimen-tangle","Tangle, Plate",["rope","tangle","engraving"],"rect","6a1122c6","464,824,726,1110",[]),
("things","specimen-butterfly","Butterfly, Pinned",["butterfly","insect","engraving"],"photo","6a1122c6","55,490,295,620",["--model","isnet-general-use"]),
("things","specimen-fish","Fish, Engraved",["fish","engraving"],"photo","6a1122c6","80,950,460,1080",["--model","isnet-general-use"]),
("things","specimen-sprig","Sprig, Torn",["leaf","sprig","engraving"],"photo","6a1122c6","245,350,460,610",["--model","isnet-general-use"]),
("things","specimen-leaves","Leaves, Three Sizes",["leaf","engraving","plant"],"photo","6a1122c6","55,670,305,980",["--model","isnet-general-use"]),
("ink","mushroom-ferns","Mushrooms and Ferns",["mushroom","fern","watercolor"],"ink","03e001b3",None,["--thresh","28"]),
("ink","moon-woman","Blue Moon, Woman Held",["moon","woman","watercolor"],"ink","07130df8",None,[]),
("ink","moon-mushrooms","Moon of Mushrooms",["moon","mushroom","ink"],"ink","0fff0149",None,[]),
("ink","cup-florals","Cup, Flowers Rising",["teacup","flowers","figure"],"ink","102acac1",None,[]),
("ink","crescent-wreath","Crescent With Leaves",["moon","crescent","leaves"],"ink","2ba84661",None,[]),
("ink","butterfly-heart-green","Heart With Green Wings",["heart","butterfly","eye"],"ink","36f980db",None,[]),
("ink","skeleton-bench","Two on a Bench",["skeleton","bench","smoking"],"ink","3bd718c0",None,[]),
("ink","cup-woman-florals","Cup, Woman Blooming",["teacup","woman","flowers"],"ink","3e9c3f07",None,[]),
("ink","cup-lavender","Cup, Lavender",["teacup","lavender","figure"],"ink","40761000",None,[]),
("ink","skeleton-cup-lavender","Skeleton in Lavender Cup",["skeleton","teacup","lavender"],"ink","42668179",None,[]),
("ink","flower-garland","Pink Flower Garland",["flowers","garland","pink"],"ink","4ce1c3ff",None,[]),
("ink","jar-skeleton","Skeleton in a Jar",["skeleton","jar","seated"],"ink","58b8ea86",None,[]),
("ink","cup-daisies","Cup, Daisies",["teacup","daisies","flowers"],"ink","6ba31471",None,[]),
("ink","butterfly-heart-wash","Heart, Pale Wings",["heart","butterfly","watercolor"],"ink","75af2f3a","0,0,1,0.9",["--thresh","28"]),
("ink","flowers-profile","Profile in Wildflowers",["woman","profile","flowers"],"ink","79050a71","0,0,0.5,0.5",[]),
("ink","sun-woman","Sun Behind Woman",["sun","woman","flowers"],"ink","79050a71","0.5,0,1,0.5",[]),
("ink","hand-mushrooms","Hand Holding Mushrooms",["hand","mushroom","stars"],"ink","79050a71","0,0.5,0.5,1",[]),
("ink","heart-wreath","Arms in a Heart Wreath",["wreath","arms","heart"],"ink","79050a71","0.5,0.5,1,1",[]),
("ink","tulip","Tulip",["tulip","flower"],"ink","917de35d","0.12,0.05,0.88,0.98",[]),
("ink","skeleton-pair","Skeletons, Hand in Hand",["skeleton","couple","smoking"],"ink","92283dc6",None,[]),
("ink","cup-woman-lines","Cup, Woman in Lines",["teacup","woman","flowers"],"ink","b2a409fc",None,[]),
("ink","wreath-circle","Circle of Leaves",["wreath","circle","leaves"],"ink","c0db0cd9",None,[]),
("ink","broken-heart","Heart, Coming Apart",["heart","eyes","lips","red"],"ink","c3eb8878",None,[]),
("ink","mushroom-eyes","Mushrooms With Eyes",["mushroom","eye","woman"],"ink","cc099352",None,[]),
("ink","sprig","Sprig",["sprig","plant","ink"],"ink","cd36eb84","0.12,0.05,0.88,0.98",[]),
("ink","butterfly-heart-blue","Heart With Blue Wings",["heart","butterfly","eye"],"ink","d173d337",None,[]),
("ink","yarrow-cup","Yarrow in a Cup",["teacup","yarrow","flowers"],"ink","d99bb754",None,[]),
("ink","skeleton-in-cup","Skeleton Bathing in Tea",["skeleton","teacup","saucer"],"ink","db6a2767",None,[]),
("ink","skeleton-lying","Skeleton, Lying Down",["skeleton","mushrooms","flowers"],"ink","f65712c0",None,[]),
]
out=[]
for g,id_,t,tags,mode,p,crop,extra in C:
    try: w,h=run(mode,p,id_,crop,extra)
    except Exception as e: print('FAIL',id_,e); continue
    out.append(f'    {{ id:"{id_}", category:"cutouts", group:"{g}", title:"{t}", image:"images/cutouts/{id_}.webp", w:{w}, h:{h}, alpha:true, tags:{json.dumps(tags)} }},')
# church (colour-key cut done separately)
import shutil; shutil.copy('/tmp/co/church3.webp',R+'images/cutouts/church-cut.webp'); w,h=Image.open(R+'images/cutouts/church-cut.webp').size
out.append(f'    {{ id:"church-cut", category:"cutouts", group:"things", title:"Church, From Below", image:"images/cutouts/church-cut.webp", w:{w}, h:{h}, alpha:true, tags:["church","gothic","stone"] }},')
open('/tmp/cutouts_entries.txt','w').write("\n".join(out)); print(len(out))
