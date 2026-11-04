async function test() {
  const rolesRes = await fetch('https://backend.patronping.com/api/auth/company-roles?email=aditi@surfsyncinfotech.in');
  console.log('Roles:', await rolesRes.json());
}
test().catch(console.error);
