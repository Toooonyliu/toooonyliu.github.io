import {test,expect} from '@playwright/test';

test.setTimeout(60000);
test.use({viewport:{width:1400,height:1200},launchOptions:{args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});
test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();});
const current=(page:any)=>page.getByTestId('flow-current');
const passport=async(page:any)=>{await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Passport',exact:true}).click();await page.getByRole('button',{name:'Expand panel',exact:true}).click();await page.getByRole('region',{name:'Passport year'}).getByRole('button',{name:'2026',exact:true}).click();};
const grouped=async(page:any)=>{await current(page).getByRole('group',{name:'Past flights display'}).getByRole('button',{name:'Trips',exact:true}).click();};

test('home prioritizes the next flight; original tabs and search work',async({page})=>{
 await expect(page.locator('.native-header h1')).toHaveText('My Flights');
 await expect(current(page).getByRole('button',{name:/UA 2148/})).toBeVisible();
 await expect(current(page).getByText('8,000 Premium Points to your goal')).toBeVisible();
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Friends',exact:true}).click();
 await expect(current(page).getByRole('heading',{name:'Add Friends’ Flights'})).toBeVisible();
 await page.getByRole('button',{name:'Search flights',exact:true}).click();
 await current(page).getByLabel('Search flight records').fill('NH 111');
 await current(page).getByRole('button',{name:/ANA 111 Detected flight number/}).click();
 await current(page).getByRole('button',{name:/Today Tue/}).click();
 await expect(current(page).locator('.flight-search-result')).toHaveCount(1);
 await current(page).locator('.flight-search-result').click();
 await current(page).getByRole('button',{name:'View My Flights'}).click();
 await expect(current(page)).toHaveCount(1);
 await expect(current(page).getByRole('button',{name:/NH 111/})).toBeVisible();
});

test('grouping is display-only until review and save; rename persists',async({page})=>{
 await passport(page);
 const before=await page.evaluate(()=>localStorage.getItem('flighty-travel-demo-v1'));
 await grouped(page);
 await expect(current(page).getByRole('button',{name:'Review trip: Japan',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('flighty-travel-demo-v1'))).toBe(before);
 await current(page).getByRole('button',{name:'Review trip: Japan',exact:true}).click();
 await expect(current(page).getByText('Travel not recorded',{exact:true})).toBeVisible();
 await expect(current(page).locator('.flight-row')).toHaveCount(4);
 await current(page).getByRole('button',{name:'Save Trip',exact:true}).click();
 await expect(current(page).getByText('4 flights · Saved trip')).toBeVisible();
 await current(page).getByRole('button',{name:'Edit trip',exact:true}).click();
 await page.getByRole('button',{name:'Rename trip',exact:true}).click();
 await page.getByLabel('Trip name').fill('Japan in spring');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(current(page).getByRole('heading',{name:'Japan in spring'})).toBeVisible();
 await page.reload();await passport(page);await grouped(page);
 await expect(current(page).getByRole('button',{name:'Open trip: Japan in spring',exact:true})).toBeVisible();
 await expect(current(page).getByText('Needs review')).toHaveCount(0);
});

test('selected year changes airline leader, flight count and source records',async({page})=>{
 await passport(page);
 await page.getByRole('region',{name:'Passport year'}).getByRole('button',{name:'2025',exact:true}).click();
 await expect(current(page).locator('.airline-leader')).toHaveText('Delta');
 await current(page).getByRole('button',{name:'View 1 flight',exact:true}).click();
 await expect(current(page).getByText('1 matching flights')).toBeVisible();
 await expect(current(page).locator('.flight-row')).toHaveCount(1);
 await page.getByRole('button',{name:'Go back',exact:true}).click();
 await expect(page.getByRole('region',{name:'Passport year'}).getByRole('button',{name:'2025',exact:true})).toHaveAttribute('aria-pressed','true');
 await grouped(page);
 await expect(current(page).getByRole('button',{name:'Open trip: New York',exact:true})).toBeVisible();
 await expect(current(page).getByRole('button',{name:'Review trip: Japan',exact:true})).toHaveCount(0);
 await page.getByRole('region',{name:'Passport year'}).getByRole('button',{name:'2024',exact:true}).click();
 await expect(current(page).getByRole('heading',{name:'No trips in this view'})).toBeVisible();
});

test('loyalty balances are separate from flown distance and offer manual account editing',async({page})=>{
 await current(page).getByRole('button',{name:'View all',exact:true}).click();
 await expect(page.locator('.bottom-sheet').getByText('Redeemable balance').first()).toBeVisible();
 await expect(page.locator('.bottom-sheet .loyalty-card')).toHaveCount(3);
 await page.getByRole('button',{name:'Edit account & goal',exact:true}).first().click();
 await expect(page.getByLabel('Premium Points already credited',{exact:true})).toHaveValue('42000');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
});

test('previous note and travel-day suppression',async({page})=>{
 await current(page).getByRole('button',{name:/You’ve flown this route/}).click();
 await expect(current(page).getByText(/Leave more time for breakfast/)).toBeVisible();
 await page.getByRole('button',{name:'Demo controls',exact:true}).click();
 await page.getByRole('switch',{name:/Within 24 hours/}).click();
 await page.getByRole('button',{name:'Done',exact:true}).click();
 await expect(current(page).getByRole('heading',{name:'Focus on your flight'})).toBeVisible();
});
