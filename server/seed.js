const db = require('./db')

const TOTAL_APARTMENTS = 2000

// --- Real apartment brand names ---
const brands = [
  'Avalon','Camden','Cortland','Broadstone','Modera','Novel','Prose',
  'Berkshire','Windsor','Post','MAA','Bell','Morgan','Gables',
  'Milestone','Lincoln','Simpson','Bozzuto','Related','Crescent',
  'Marquis','Watermark','Latitude','Altitude','Domain','Epoch',
  'Era','Chapter','Circa','Canvas','Compass','Anchor','Coda',
  'Encore','Overture','Aura','Ascent','Solaris','Arrive','Citizen',
  'Velocity','Luxe','Linden','Olmsted','Alto','Amavi','Ascend',
  'Elme','Ario','Solera','Palette','Verse','Edge','Axis','Apex',
  'Vibe','Haven','Signal','Union','District','Quarter',
]

const propertyTypes = ['Apartment','Loft','Studio','Condo','Townhouse','House']

const cities = [
  {
    city: 'New York', state: 'NY',
    zips: ['10001','10002','10003','10011','10014','10016','10017','10019','10022','10036'],
    neighborhoods: ['Midtown','Chelsea',"Hell's Kitchen",'Murray Hill','Kips Bay','Gramercy','Flatiron','NoMad','Hudson Yards','SoHo'],
    streets: ['W 42nd St','Lexington Ave','8th Ave','Amsterdam Ave','Columbus Ave','Park Ave S','Madison Ave','5th Ave','W 57th St','7th Ave']
  },
  {
    city: 'Brooklyn', state: 'NY',
    zips: ['11201','11205','11215','11217','11222','11238'],
    neighborhoods: ['Park Slope','Williamsburg','DUMBO','Cobble Hill','Boerum Hill','Crown Heights','Prospect Heights','Fort Greene','Greenpoint','Red Hook'],
    streets: ['Atlantic Ave','Flatbush Ave','Bedford Ave','Franklin Ave','Nostrand Ave','Myrtle Ave','DeKalb Ave','Fulton St','Court St','Smith St']
  },
  {
    city: 'Queens', state: 'NY',
    zips: ['11101','11102','11103','11354','11375'],
    neighborhoods: ['Long Island City','Astoria','Jackson Heights','Flushing','Forest Hills','Sunnyside','Woodside','Rego Park'],
    streets: ['Queens Blvd','Northern Blvd','Jackson Ave','30th Ave','Steinway St','Main St','Hillside Ave','Jamaica Ave']
  },
  {
    city: 'Bronx', state: 'NY',
    zips: ['10451','10452','10456','10467','10468'],
    neighborhoods: ['Mott Haven','South Bronx','Fordham','Riverdale','Pelham Bay','Morris Heights','Tremont','Concourse'],
    streets: ['Grand Concourse','E 149th St','Jerome Ave','Tremont Ave','Boston Rd','White Plains Rd','Fordham Rd']
  },
  {
    city: 'Hoboken', state: 'NJ',
    zips: ['07030'],
    neighborhoods: ['Downtown Hoboken','Uptown Hoboken','Hoboken Waterfront','Castle Point','Hudson Tea'],
    streets: ['Washington St','Hudson St','Grand St','Park Ave','Clinton St','Bloomfield St','Adams St']
  },
  {
    city: 'Jersey City', state: 'NJ',
    zips: ['07302','07304','07306','07310'],
    neighborhoods: ['Downtown','Journal Square','The Heights','Newport','Paulus Hook','Bergen-Lafayette'],
    streets: ['Newark Ave','Grove St','Montgomery St','Grand St','Communipaw Ave','West Side Ave','Bergen Ave']
  },
  {
    city: 'Newark', state: 'NJ',
    zips: ['07101','07102','07103','07104'],
    neighborhoods: ['Downtown Newark','Ironbound','Weequahic','Forest Hill','North Ironbound','Springfield Ave'],
    streets: ['Broad St','Market St','McCarter Hwy','Springfield Ave','Bloomfield Ave','Clinton Ave','Ferry St']
  },
  {
    city: 'Stamford', state: 'CT',
    zips: ['06901','06902','06903','06905'],
    neighborhoods: ['Downtown Stamford','South End','Shippan','Glenbrook','Springdale','Turn of River'],
    streets: ['Atlantic St','Main St','Tresser Blvd','Long Ridge Rd','Bedford St','Washington Blvd','Summer St']
  },
  {
    city: 'New Haven', state: 'CT',
    zips: ['06510','06511','06512','06513'],
    neighborhoods: ['Downtown','East Rock','Wooster Square','Westville','Fair Haven','Dwight','Ninth Square'],
    streets: ['Chapel St','Whalley Ave','Grand Ave','Dixwell Ave','Orange St','Whitney Ave','Winthrop Ave']
  },
  {
    city: 'Philadelphia', state: 'PA',
    zips: ['19102','19103','19106','19107','19130'],
    neighborhoods: ['Center City','Rittenhouse','Old City','Fishtown','Northern Liberties','Fairmount','Spring Garden'],
    streets: ['Market St','Chestnut St','Walnut St','Broad St','Girard Ave','Spring Garden St','Passyunk Ave']
  },
  {
    city: 'Pittsburgh', state: 'PA',
    zips: ['15201','15203','15206','15213','15232'],
    neighborhoods: ['Downtown','Shadyside','Lawrenceville','East Liberty','Squirrel Hill','South Side','Bloomfield'],
    streets: ['Penn Ave','Fifth Ave','Forbes Ave','Carson St','Butler St','Murray Ave','Liberty Ave']
  },
  {
    city: 'Boston', state: 'MA',
    zips: ['02101','02108','02116','02118','02134'],
    neighborhoods: ['Back Bay','South End','Beacon Hill','Fenway','Seaport','Downtown','Allston'],
    streets: ['Boylston St','Tremont St','Commonwealth Ave','Newbury St','Washington St','Huntington Ave','Cambridge St']
  },
  {
    city: 'Cambridge', state: 'MA',
    zips: ['02138','02139','02140','02141'],
    neighborhoods: ['Harvard Square','Central Square','Kendall Square','Inman Square','Porter Square','Mid-Cambridge'],
    streets: ['Massachusetts Ave','Main St','Broadway','Prospect St','Hampshire St','Mt Auburn St','Brattle St']
  },
  {
    city: 'Providence', state: 'RI',
    zips: ['02903','02904','02905','02906'],
    neighborhoods: ['Downtown','College Hill','Federal Hill','Fox Point','Elmhurst','Wayland Square','Jewelry District'],
    streets: ['Westminster St','Thayer St','Broad St','Atwells Ave','Hope St','Wickenden St','Elmwood Ave']
  },
  {
    city: 'Washington', state: 'DC',
    zips: ['20001','20002','20003','20009','20010'],
    neighborhoods: ['Dupont Circle','Logan Circle','Capitol Hill','Shaw','Columbia Heights','Adams Morgan','Navy Yard'],
    streets: ['14th St NW','U St NW','Georgia Ave NW','Massachusetts Ave NW','Pennsylvania Ave SE','H St NE','7th St NW']
  },
  {
    city: 'Baltimore', state: 'MD',
    zips: ['21201','21202','21205','21211','21218'],
    neighborhoods: ['Inner Harbor','Federal Hill','Fells Point','Hampden','Canton','Station North','Mount Vernon'],
    streets: ['Charles St','Light St','Thames St','36th St','Falls Rd','Pratt St','Eastern Ave']
  },
  {
    city: 'Richmond', state: 'VA',
    zips: ['23220','23221','23222','23223'],
    neighborhoods: ['The Fan','Carytown',"Scott's Addition",'Church Hill','Manchester','Museum District','Shockoe Bottom'],
    streets: ['W Broad St','Cary St','Monument Ave','Main St','Hull St','Boulevard','N Arthur Ashe Blvd']
  },
  {
    city: 'Charlotte', state: 'NC',
    zips: ['28202','28203','28204','28205','28206'],
    neighborhoods: ['Uptown','South End','NoDa','Plaza Midwood','Elizabeth','Dilworth','Fourth Ward'],
    streets: ['Tryon St','Trade St','South Blvd','Central Ave','Elizabeth Ave','Park Rd','Morehead St']
  },
  {
    city: 'Raleigh', state: 'NC',
    zips: ['27601','27603','27605','27607','27609'],
    neighborhoods: ['Downtown','Glenwood South','Five Points','Cameron Village','North Hills','Boylan Heights','Mordecai'],
    streets: ['Fayetteville St','Glenwood Ave','Capital Blvd','Western Blvd','Wade Ave','Six Forks Rd','Hillsborough St']
  },
  {
    city: 'Atlanta', state: 'GA',
    zips: ['30301','30306','30308','30309','30318'],
    neighborhoods: ['Midtown','Buckhead','Old Fourth Ward','Inman Park','West Midtown','Little Five Points','Ponce City Market'],
    streets: ['Peachtree St NE','Ponce de Leon Ave','Edgewood Ave','Marietta St','Howell Mill Rd','Boulevard NE','Spring St NW']
  },
  {
    city: 'Miami', state: 'FL',
    zips: ['33101','33125','33130','33131','33132'],
    neighborhoods: ['Brickell','Downtown','Wynwood','Little Havana','Edgewater','Midtown Miami','Design District'],
    streets: ['Brickell Ave','NW 2nd Ave','SW 8th St','Biscayne Blvd','NE 2nd Ave','NW 36th St','SW 1st St']
  },
  {
    city: 'Orlando', state: 'FL',
    zips: ['32801','32803','32804','32805','32806'],
    neighborhoods: ['Downtown','Thornton Park','College Park','SoDo','Colonialtown','Milk District','Audubon Park'],
    streets: ['Orange Ave','Colonial Dr','Mills Ave','Edgewater Dr','Curry Ford Rd','Robinson St','Lake Eola Dr']
  },
  {
    city: 'Tampa', state: 'FL',
    zips: ['33602','33603','33605','33606','33607'],
    neighborhoods: ['Downtown','Ybor City','Hyde Park','Channelside','Seminole Heights','Westshore','South Tampa'],
    streets: ['Kennedy Blvd','Bayshore Blvd','Dale Mabry Hwy','Armenia Ave','Nebraska Ave','Swann Ave','Howard Ave']
  },
  {
    city: 'Chicago', state: 'IL',
    zips: ['60601','60605','60607','60610','60614'],
    neighborhoods: ['The Loop','River North','Lincoln Park','Wicker Park','West Loop','Lakeview','Gold Coast'],
    streets: ['Michigan Ave','Wacker Dr','State St','Clark St','Halsted St','Milwaukee Ave','Armitage Ave']
  },
  {
    city: 'Detroit', state: 'MI',
    zips: ['48201','48202','48203','48207','48214'],
    neighborhoods: ['Midtown','Corktown','New Center','Eastern Market','Rivertown','Woodbridge','Brush Park'],
    streets: ['Woodward Ave','Michigan Ave','Gratiot Ave','Grand River Ave','Jefferson Ave','W Warren Ave','Rosa Parks Blvd']
  },
  {
    city: 'Minneapolis', state: 'MN',
    zips: ['55401','55403','55404','55405','55408'],
    neighborhoods: ['Downtown','Uptown','North Loop','Whittier','Loring Park','Stevens Square','Elliot Park'],
    streets: ['Nicollet Mall','Hennepin Ave','Lyndale Ave S','Lake St','Cedar Ave','Washington Ave S','1st Ave N']
  },
  {
    city: 'St. Louis', state: 'MO',
    zips: ['63101','63103','63104','63108','63110'],
    neighborhoods: ['Downtown','Central West End','Soulard','The Grove','Lafayette Square','Midtown','Tower Grove'],
    streets: ['Market St','Grand Blvd','Olive St','Lindell Blvd','Manchester Ave','Arsenal St','South Grand Blvd']
  },
  {
    city: 'Kansas City', state: 'MO',
    zips: ['64101','64105','64108','64109','64110'],
    neighborhoods: ['Downtown','Crossroads','Midtown','Westport','River Market','Hyde Park','Brookside'],
    streets: ['Main St','Broadway Blvd','Troost Ave','Westport Rd','Southwest Blvd','Armour Blvd','Oak St']
  },
  {
    city: 'Dallas', state: 'TX',
    zips: ['75201','75202','75203','75204','75205'],
    neighborhoods: ['Downtown','Uptown','Deep Ellum','Knox-Henderson','Lower Greenville','Bishop Arts','Design District'],
    streets: ['Commerce St','Main St','McKinney Ave','Greenville Ave','Henderson Ave','Maple Ave','Oak Lawn Ave']
  },
  {
    city: 'Houston', state: 'TX',
    zips: ['77002','77003','77004','77006','77007'],
    neighborhoods: ['Downtown','Midtown','Montrose','The Heights','EaDo','Museum District','Neartown'],
    streets: ['Main St','Westheimer Rd','Washington Ave','Montrose Blvd','Shepherd Dr','San Jacinto St','Travis St']
  },
  {
    city: 'Austin', state: 'TX',
    zips: ['78701','78702','78703','78704','78705'],
    neighborhoods: ['Downtown','East Austin','South Congress','Hyde Park','Rainey Street','Red River District','Mueller'],
    streets: ['Congress Ave','6th St','Lamar Blvd','Red River St','South Congress Ave','E César Chávez St','Riverside Dr']
  },
  {
    city: 'San Antonio', state: 'TX',
    zips: ['78201','78202','78203','78204','78205'],
    neighborhoods: ['Downtown','Southtown','King William','Pearl District','Monte Vista','Government Hill','Tobin Hill'],
    streets: ['Houston St','Broadway St',"St Mary's St",'S Alamo St','E Commerce St','N Main Ave','McCullough Ave']
  },
  {
    city: 'Denver', state: 'CO',
    zips: ['80202','80203','80204','80205','80206'],
    neighborhoods: ['LoDo','RiNo','Capitol Hill','Five Points','Highland','Cherry Creek','Baker'],
    streets: ['16th St Mall','Colfax Ave','Broadway','Larimer St','Blake St','Federal Blvd','Speer Blvd']
  },
  {
    city: 'Phoenix', state: 'AZ',
    zips: ['85001','85003','85004','85006','85007'],
    neighborhoods: ['Downtown','Midtown','Uptown','Roosevelt Row','Melrose District','Arcadia','Central Corridor'],
    streets: ['Central Ave','Camelback Rd','McDowell Rd','Indian School Rd','Grand Ave','Van Buren St','7th St']
  },
  {
    city: 'Las Vegas', state: 'NV',
    zips: ['89101','89102','89104','89106','89109'],
    neighborhoods: ['Downtown','Arts District','Paradise','Spring Valley','Summerlin South','Whitney Ranch','Centennial Hills'],
    streets: ['Las Vegas Blvd','Fremont St','Charleston Blvd','Sahara Ave','Desert Inn Rd','Maryland Pkwy','Flamingo Rd']
  },
  {
    city: 'Los Angeles', state: 'CA',
    zips: ['90001','90004','90005','90012','90015'],
    neighborhoods: ['Downtown','Silver Lake','Echo Park','Koreatown','Mid-City','Arts District','Westlake'],
    streets: ['Wilshire Blvd','Vermont Ave','Figueroa St','Olympic Blvd','Sunset Blvd','Hoover St','6th St']
  },
  {
    city: 'San Francisco', state: 'CA',
    zips: ['94102','94103','94105','94107','94110'],
    neighborhoods: ['SoMa','Mission District','Castro','Hayes Valley','NoPa','Potrero Hill','Dogpatch'],
    streets: ['Market St','Mission St','Valencia St','Folsom St','2nd St','Divisadero St','16th St']
  },
  {
    city: 'Oakland', state: 'CA',
    zips: ['94601','94602','94606','94607','94609'],
    neighborhoods: ['Uptown','Temescal','Rockridge','Jack London Square','Grand Lake','Fruitvale','Old Oakland'],
    streets: ['Telegraph Ave','Broadway','International Blvd','MacArthur Blvd','Grand Ave','San Pablo Ave','Piedmont Ave']
  },
  {
    city: 'San Diego', state: 'CA',
    zips: ['92101','92103','92104','92108','92110'],
    neighborhoods: ['Downtown','North Park','Hillcrest','South Park','Little Italy','East Village','Bankers Hill'],
    streets: ['India St','University Ave','30th St','El Cajon Blvd','Park Blvd','5th Ave','Washington St']
  },
  {
    city: 'Seattle', state: 'WA',
    zips: ['98101','98102','98103','98104','98109'],
    neighborhoods: ['Capitol Hill','South Lake Union','Belltown','Queen Anne','Fremont','Pioneer Square','First Hill'],
    streets: ['Pike St','Pine St','Eastlake Ave','Westlake Ave','Broadway','2nd Ave','Dexter Ave N']
  },
  {
    city: 'Portland', state: 'OR',
    zips: ['97201','97202','97203','97205','97209'],
    neighborhoods: ['Pearl District','Alberta Arts District','Division','Mississippi Ave','Hawthorne','Slabtown','Lloyd District'],
    streets: ['Burnside St','Alberta St','Division St','Mississippi Ave','Hawthorne Blvd','Lovejoy St','Sandy Blvd']
  },
]

const reviewTitles = [
  'Great place overall', 'Loved living here', 'Decent but could be better', 'Would not recommend',
  'Hidden gem in the city', 'Very responsive management', 'Noisy neighborhood', 'Clean and well-maintained',
  'Fantastic location', 'Outdated appliances', 'Best apartment I\'ve rented', 'Thin walls, hear everything',
  'Maintenance is slow', 'Cozy and comfortable', 'Good value for the price', 'Love the natural light',
  'Parking is a nightmare', 'Great amenities', 'Management is unresponsive', 'Perfect for young professionals',
  'Roaches were an issue', 'Super safe neighborhood', 'Modern and stylish', 'Drafty in winter',
  'Amazing views', 'Would rent again', 'Water pressure is terrible', 'Quiet and peaceful',
  'Overpriced for what you get', 'Friendly neighbors'
]

const reviewTexts = [
  'Loved the big windows and open floor plan. The neighborhood is walkable and transit is nearby.',
  'Management was slow to fix issues but the apartment itself was lovely and spacious.',
  'Great location but street noise can be rough on weekends. Earplugs recommended.',
  'Spacious, quiet, and the landlord is super responsive. Nothing broke without being fixed fast.',
  'Nothing fancy but clean, well-maintained, and affordable for this area.',
  'Took 3 weeks to fix a leaky faucet. The space is nice but maintenance needs work.',
  'Incredible natural light all day. The layout is smart and storage is generous.',
  'Thin walls mean you hear everything — music, arguments, footsteps above. Difficult to sleep.',
  'The building is dated but management keeps it clean. Hot water is reliable.',
  'Best commute I\'ve ever had. Two blocks from the train and the neighborhood feels safe at night.',
  'Had a pest issue in the first month but management handled it quickly and professionally.',
  'Modern finishes, stainless appliances, and in-unit laundry. Worth every penny.',
  'Parking situation is a disaster. Street parking only and meters are enforced until 10pm.',
  'The rooftop access is a huge plus. Stunning views of the skyline in summer.',
  'AC unit broke in August and it took 10 days to fix. Not acceptable in that heat.',
  'Genuinely the best apartment I\'ve ever lived in. Would move back in a heartbeat.',
  'Floors creak loudly. Every step you take can be heard by downstairs neighbors.',
  'Rent went up 12% at renewal with no improvements made to the unit. Disappointing.',
  'Super quiet building, friendly neighbors, and the super is always available.',
  'A bit overpriced for the size but the location makes up for almost everything.'
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min, max, decimals = 1) { return parseFloat((Math.random() * (max - min) + min).toFixed(decimals)) }

function generateApartmentName(brand, neighborhood) {
  const formats = [
    `${brand} ${neighborhood}`,
    `${brand} at ${neighborhood}`,
    `The ${neighborhood}`,
    `${neighborhood} by ${brand}`,
    `${brand} ${neighborhood} Residences`,
  ]
  return pick(formats)
}

function generateApartments(landlordId) {
  const apts = []
  for (let i = 0; i < TOTAL_APARTMENTS; i++) {
    const loc   = pick(cities)
    const num   = randInt(1, 999)
    const street = pick(loc.streets)
    const zip   = pick(loc.zips)
    const type  = pick(propertyTypes)
    const year  = randInt(1960, 2023)
    const brand = pick(brands)
    const hood  = pick(loc.neighborhoods)
    apts.push([
      generateApartmentName(brand, hood),
      `${num} ${street}`,
      loc.city,
      loc.state,
      zip,
      type,
      year,
      landlordId
    ])
  }
  return apts
}

// --- Main seed ---
setTimeout(() => {
  db.serialize(() => {
    db.get('SELECT COUNT(*) as count FROM apartments', (err, row) => {
      if (err) { console.error('Seed check error:', err); return }
      if (row && row.count > 0) {
        console.log(`Database already has ${row.count} apartments — skipping seed.`)
        return
      }

      console.log(`Seeding ${TOTAL_APARTMENTS} apartments...`)

      db.run(
        `INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)`,
        ['Demo', 'Landlord', 'landlord@rentwise.com', '$2b$10$PLACEHOLDER_NOT_FOR_LOGIN', 'landlord'],
        function (err) {
          if (err) { console.error('Landlord seed error:', err); return }
          const landlordId = this.lastID

          db.run(
            `INSERT INTO users (first_name, last_name, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?, ?)`,
            ['Demo', 'Renter', 'renter@rentwise.com', '$2b$10$PLACEHOLDER_NOT_FOR_LOGIN', 'renter', 1],
            function (err) {
              if (err) { console.error('Renter seed error:', err); return }
              const renterId = this.lastID

              const apts = generateApartments(landlordId)

              // Bulk insert apartments in a single transaction for speed
              db.run('BEGIN TRANSACTION')
              const insertApt = db.prepare(
                `INSERT INTO apartments (name, street_address, city, state, zip_code, property_type, year_built, owner_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
              )
              apts.forEach(a => insertApt.run(...a))
              insertApt.finalize()
              db.run('COMMIT', (err) => {
                if (err) { console.error('Apt commit error:', err); return }
                console.log(`✅ Inserted ${TOTAL_APARTMENTS} apartments`)

                // Assign one Picsum photo URL to every apartment, THEN seed reviews
                db.all('SELECT id FROM apartments', (err, allApts) => {
                  if (err) { console.error('Photo seed fetch error:', err); return }
                  db.run('BEGIN TRANSACTION')
                  const insertPhoto = db.prepare(
                    `INSERT INTO apartment_photos (apartment_id, photo_data, display_order) VALUES (?, ?, 0)`
                  )
                  allApts.forEach(a => {
                    const photoUrl = `https://picsum.photos/seed/apt-${a.id}/600/400`
                    insertPhoto.run(a.id, photoUrl)
                  })
                  // COMMIT must be inside finalize() callback to ensure all rows are written first
                  insertPhoto.finalize(() => {
                    db.run('COMMIT', photoErr => {
                      if (photoErr) console.error('Photo commit error:', photoErr)
                      else console.log(`✅ Assigned photos to ${allApts.length} apartments`)

                      // Seed reviews only after photos are committed
                      seedReviews(renterId)
                    })
                  })
                })
              })
            }
          )
        }
      )
    })
  })
}, 1000)

function seedReviews(renterId) {
                // Add reviews to a random sample of 600 apartments (multiple reviews each)
                db.all('SELECT id FROM apartments ORDER BY RANDOM() LIMIT 600', (err, aptRows) => {
                  if (err) { console.error('Apt fetch error:', err); return }

                  db.run('BEGIN TRANSACTION')
                  const insertVer = db.prepare(
                    `INSERT INTO verifications (user_id, apartment_id, doc_type, verification_status) VALUES (?, ?, ?, ?)`
                  )
                  const insertRev = db.prepare(
                    `INSERT INTO reviews (verification_id, rating_overall, rating_safety, rating_management, title, review_text)
                     VALUES (?, ?, ?, ?, ?, ?)`
                  )

                  // Give each of the 600 apartments 1–4 reviews
                  // We can't get lastID inside a prepared statement easily in SQLite3 node,
                  // so we build verifications first, then match via a subquery approach.
                  // Instead: use individual runs inside the transaction.
                  db.run('COMMIT') // close the open transaction first

                  let reviewCount = 0
                  let aptIndex = 0

                  function seedNextApt() {
                    if (aptIndex >= aptRows.length) {
                      insertVer.finalize()
                      insertRev.finalize()
                      console.log(`✅ Seeded ${reviewCount} reviews across ${aptRows.length} apartments`)
                      console.log('🎉 Database seed complete!')
                      return
                    }

                    const apt = aptRows[aptIndex++]
                    const numReviews = randInt(1, 4)
                    let done = 0

                    for (let r = 0; r < numReviews; r++) {
                      db.run(
                        `INSERT INTO verifications (user_id, apartment_id, doc_type, verification_status) VALUES (?, ?, ?, ?)`,
                        [renterId, apt.id, pick(['lease','utility_bill','postal_mail']), 'verified'],
                        function (err) {
                          if (err) { done++; if (done === numReviews) seedNextApt(); return }
                          const vId = this.lastID
                          const overall  = randFloat(1, 5)
                          const safety   = randFloat(1, 5)
                          const mgmt     = randFloat(1, 5)
                          db.run(
                            `INSERT INTO reviews (verification_id, rating_overall, rating_safety, rating_management, title, review_text)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [vId, overall, safety, mgmt, pick(reviewTitles), pick(reviewTexts)],
                            () => {
                              reviewCount++
                              done++
                              if (done === numReviews) seedNextApt()
                            }
                          )
                        }
                      )
                    }
                  }

                  seedNextApt()
                })
}
